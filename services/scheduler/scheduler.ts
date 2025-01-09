import { PrismaClient, Schedule } from '@prisma/client';
import { schedulerQueue } from './queue';
import { parseExpression } from 'cron-parser';
import { Job } from 'bullmq';

const prisma = new PrismaClient();

type ScheduleType = 'INTERVAL' | 'CRON' | 'FIXED';

export class SchedulerService {
  private static instance: SchedulerService;

  private constructor() {
    // Initialize scheduler
    this.initializeScheduler();
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  private async initializeScheduler() {
    // Get all active schedules
    const schedules = await prisma.schedule.findMany({
      where: {
        enabled: true,
      },
      include: {
        agent: true,
      },
    });

    // Schedule all active tasks
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
          nextRun = null; // Don't schedule if the fixed time is in the past
        }
        break;
    }

    if (nextRun) {
      // Calculate delay in milliseconds
      const delay = nextRun.getTime() - now.getTime();

      // Add job to queue
      await schedulerQueue.add(
        `schedule:${schedule.id}`,
        {
          scheduleId: schedule.id,
          agentId: schedule.agent.id,
          input: (schedule.metadata as { input?: string })?.input || '',
          metadata: schedule.metadata,
        },
        {
          delay,
          jobId: `schedule:${schedule.id}`,
          repeat:
            schedule.type === 'FIXED'
              ? undefined
              : {
                  pattern: schedule.type === 'CRON' ? schedule.cronExpression! : undefined,
                  every: schedule.type === 'INTERVAL' ? schedule.interval! * 60000 : undefined,
                },
        }
      );

      // Update next run time in database
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          nextRun: nextRun,
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

  private async removeJob(scheduleId: number) {
    const jobId = `schedule:${scheduleId}`;
    const job = await Job.fromId(schedulerQueue, jobId);
    if (job) {
      await job.remove();
      console.log(`Job ${jobId} has been removed.`);
    } else {
      console.log(`Job ${jobId} not found.`);
    }
  }

  public async pauseSchedule(scheduleId: number) {
    // Remove job from queue
    await this.removeJob(scheduleId);

    // Update database
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

    // Update database first
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { enabled: true },
    });

    // Reschedule the task
    await this.scheduleTask(schedule);

    return schedule;
  }

  public async deleteSchedule(scheduleId: number) {
    // Remove job from queue
    await this.removeJob(scheduleId);

    // Delete from database
    return prisma.schedule.delete({
      where: { id: scheduleId },
    });
  }

  public async getSchedule(scheduleId: number) {
    return prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        agent: true,
        logs: true,
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
        logs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export default SchedulerService; 