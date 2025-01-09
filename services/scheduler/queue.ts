import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Agent } from '../../agent';
import { redisClient } from '../../config/redis';
import { BaseMessage } from '@langchain/core/messages';
import { loadAgentExtensions } from '../../utils/extensions';

const prisma = new PrismaClient();

interface ScheduledJobData {
  scheduleId: number;
  agentId: number;
  input: string;
  metadata?: any;
}

// Create the scheduler queue with Redis connection
export const schedulerQueue = new Queue<ScheduledJobData>('scheduler', {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

// Worker to process scheduled jobs
const worker = new Worker<ScheduledJobData>(
  'scheduler',
  async (job: Job<ScheduledJobData>) => {
    const { scheduleId, agentId, input, metadata } = job.data;
    let log: { id: number } | null = null;

    try {
      // Update schedule log start time
      log = await prisma.scheduleLog.create({
        data: {
          scheduleId,
          status: 'running',
          startTime: new Date(),
          metadata: metadata ? metadata : undefined,
        },
      });

      // Get the agent with extensions and workspaces
      const agentData = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          extensions: {
            include: {
              extension: true
            }
          },
          workspaces: {
            include: {
              workspace: {
                include: {
                  extensions: {
                    include: { extension: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!agentData) {
        throw new Error('Agent not found');
      }

      // Create a new thread for this run
      const thread = await prisma.thread.create({
        data: {
          agentId,
          name: `Scheduled Run - ${new Date().toISOString()}`,
        },
      });

      // Load extensions using the utility function
      const extensions = await loadAgentExtensions(agentData);

      // Initialize agent
      const agent = new Agent(
        extensions,
        {
          onMessage: async (message: BaseMessage) => {
            // Save message to thread
            await prisma.message.create({
              data: {
                threadId: thread.id,
                role: message instanceof BaseMessage ? message.constructor.name.toLowerCase() : 'unknown',
                content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
              },
            });
          },
        },
        {
          modelName: process.env.LLM_MODEL || 'gpt-4o',
          temperature: 0,
          agentDescription: agentData.description || undefined,
          requireUserConfirmation: false,
          createPlanBeforeExecution: true
        }
      );

      // Execute the agent
      await agent.execute(input);

      // Update schedule log with success
      await prisma.scheduleLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          endTime: new Date(),
        },
      });

      // Update schedule's lastRun and nextRun
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          lastRun: new Date(),
        },
      });

    } catch (error) {
      // Update schedule log with failure
      if (log) {
        await prisma.scheduleLog.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            endTime: new Date(),
          },
        });
      }

      throw error;
    }
  },
  { connection: redisClient }
);

worker.on('completed', (job: Job<ScheduledJobData>) => {
  console.log(`Job ${job.id} completed for schedule ${job.data.scheduleId}`);
});

worker.on('failed', (job: Job<ScheduledJobData> | undefined, error: Error) => {
  if (job) {
    console.error(`Job ${job.id} failed for schedule ${job.data.scheduleId}:`, error);
  } else {
    console.error('Job failed:', error);
  }
});

export default schedulerQueue; 