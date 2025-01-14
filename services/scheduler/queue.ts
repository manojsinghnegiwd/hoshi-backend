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
    console.log('Processing job:', job.id, job.data);
    const { scheduleId, agentId, input, metadata } = job.data;
    let run: { id: number } | null = null;
    let thread: { id: number } | null = null;

    try {
      // Create schedule run
      run = await prisma.scheduleRun.create({
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
      thread = await prisma.thread.create({
        data: {
          agentId,
          name: `Scheduled Run - ${new Date().toISOString()}`,
        },
      });

      // Link thread to run
      await prisma.scheduleRun.update({
        where: { id: run.id },
        data: { threadId: thread.id }
      });

      // Load extensions using the utility function
      const extensions = await loadAgentExtensions(agentData);

      // Initialize agent
      const agent = new Agent(
        extensions,
        {
          onMessage: async (message: BaseMessage) => {
            if (!thread) return;
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

      // Update run with success
      if (run) {
        await prisma.scheduleRun.update({
          where: { id: run.id },
          data: {
            status: 'success',
            endTime: new Date(),
          },
        });
      }

      // Update schedule's lastRun
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          lastRun: new Date(),
        },
      });

    } catch (error) {
      // Add error message to thread if it exists
      if (thread) {
        await prisma.message.create({
          data: {
            threadId: thread.id,
            role: 'system',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }

      // Update run with failure
      if (run) {
        await prisma.scheduleRun.update({
          where: { id: run.id },
          data: {
            status: 'failed',
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