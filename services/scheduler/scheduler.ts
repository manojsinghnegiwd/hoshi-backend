import { PrismaClient, Schedule } from '@prisma/client';
import { schedulerQueue } from './queue';
import { parseExpression } from 'cron-parser';
import { Job, Queue } from 'bullmq';

const prisma = new PrismaClient();

type ScheduleType = 'INTERVAL' | 'CRON' | 'FIXED';

export class SchedulerService {
  private static instance: SchedulerService;

  private constructor() {
    this.initializeScheduler();
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  private async initializeScheduler() {
    const schedules = await prisma.schedule.findMany({
      where: {
        enabled: true,
      },
      include: {
        agent: true,
      },
    });

    for (const schedule of schedules) {
      await this.scheduleTask(schedule);
    }
  }

  private async scheduleTask(schedule: Schedule & { agent: any }) {
    const now = new Date();
    let nextRun: Date | null = null;

    switch (schedule.type as ScheduleType) {
      case 'INTERVAL':
        if (!schedule.interval) throw new Error('Interval not specified');
        nextRun = new Date(now.getTime() + schedule.interval * 60000);
        break;

      case 'CRON':
        if (!schedule.cronExpression) throw new Error('Cron expression not specified');
        try {
          const interval = parseExpression(schedule.cronExpression, {
            currentDate: now,
            tz: schedule.timezone,
          });
          nextRun = interval.next().toDate();
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Invalid cron expression: ${error.message}`);
          }
          throw new Error('Invalid cron expression');
        }
        break;

      case 'FIXED':
        if (!schedule.fixedTime) throw new Error('Fixed time not specified');
        nextRun = new Date(schedule.fixedTime);
        if (nextRun < now) {
          nextRun = null;
        }
        break;
    }

    if (nextRun) {
      const jobData = {
        scheduleId: schedule.id,
        agentId: schedule.agent.id,
        input: (schedule.metadata as { input?: string })?.input || '',
        metadata: schedule.metadata,
      };

      let job;
      const jobName = `schedule:${schedule.id}`;

      if (schedule.type === 'FIXED') {
        const delay = nextRun.getTime() - now.getTime();
        job = await schedulerQueue.add(jobName, jobData, { delay });
      } else {
        const repeatOptions = schedule.type === 'CRON' 
          ? { pattern: schedule.cronExpression! }
          : { every: schedule.interval! * 60000 };

        job = await schedulerQueue.upsertJobScheduler(
          jobName,
          repeatOptions,
          { name: jobName, data: jobData }
        );
      }

      console.log('Job added:', job.id, jobName);

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          nextRun: nextRun,
          jobId: job.id,
        },
      });
    }
  }

  public async createSchedule(data: {
    agentId: number;
    type: ScheduleType;
    interval?: number;
    cronExpression?: string;
    fixedTime?: Date;
    timezone?: string;
    metadata?: any;
    userId: string;
  }) {
    const schedule = await prisma.schedule.create({
      data: {
        ...data,
        enabled: true,
      },
      include: {
        agent: true,
      },
    });

    await this.scheduleTask(schedule);
    return schedule;
  }

  private async removeJob(jobId: string) {
    const job = await Job.fromId(schedulerQueue, jobId);
    console.log('Removing job:', jobId, job);

    if (job) {
      if (job.opts.repeat) {
        await schedulerQueue.removeJobScheduler(job.name);
        console.log(`Repeatable job ${job.name} removed.`);
      } else {
        await job.remove();
        console.log(`Job ${jobId} removed.`);
      }
    } else {
      console.log(`Job ${jobId} not found.`);
    }
  }

  public async pauseSchedule(scheduleId: number, jobId: string | null) {
    if (jobId) {
      await this.removeJob(jobId);
    }
    return prisma.schedule.update({
      where: { id: scheduleId },
      data: { enabled: false },
    });
  }

  public async resumeSchedule(scheduleId: number) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        agent: true,
      },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { enabled: true },
    });

    await this.scheduleTask(schedule);

    return schedule;
  }

  public async deleteSchedule(scheduleId: number, jobId: string | null) {
    if (jobId) {
      await this.removeJob(jobId);
    }
    return prisma.schedule.delete({
      where: { id: scheduleId },
    });
  }

  public async getSchedule(scheduleId: number) {
    return prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        agent: true,
        runs: {
          include: {
            thread: {
              include: {
                messages: true
              }
            }
          }
        }
      },
    });
  }

  public async listSchedules(filters: {
    enabled?: boolean;
    agentId?: number;
  } = {}) {
    return prisma.schedule.findMany({
      where: filters,
      include: {
        agent: true,
        runs: {
          include: {
            thread: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export default SchedulerService; 