import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Agent, Extension, Message } from '../agent';
import path from 'path';

const prisma = new PrismaClient();
const threadRouter = express.Router();

type MessageRole = 'system' | 'user' | 'assistant';

function isValidRole(role: string): role is MessageRole {
  return ['system', 'user', 'assistant'].includes(role);
}

async function loadExtension(name: string): Promise<Extension | null> {
  try {
    const extensionModule = await import(path.join('../extensions', name));
    return extensionModule.default;
  } catch (error) {
    console.error(`Failed to load extension ${name}:`, error);
    return null;
  }
}

// Create a new thread for an agent
threadRouter.post('/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.agentId);
    
    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Create new thread with initial assistant message
    const thread = await prisma.thread.create({
      data: {
        agentId,
        name: `Thread ${new Date().toISOString()}`, // Temporary name
        messages: {
          create: [{
            role: 'assistant',
            content: "Let's accomplish together! What do you want me to do today?"
          }]
        }
      },
      include: {
        messages: true
      }
    });

    res.status(201).json(thread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all threads for an agent
threadRouter.get('/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.agentId);
    const threads = await prisma.thread.findMany({
      where: { agentId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    res.status(200).json(threads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific thread with messages
threadRouter.get('/:threadId', async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    res.status(200).json(thread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a message to a thread and get agent's response
threadRouter.post('/:threadId/message', async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    
    // Get thread with messages
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!thread) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        threadId,
        role: 'user' as const,
        content: req.body.content
      }
    });

    // Convert messages to the correct format
    const messages: Message[] = thread.messages.map(msg => ({
      role: isValidRole(msg.role) ? msg.role : 'system',
      content: msg.content
    }));

    // Process agent response
    await processAgentResponse(threadId, req.body.content, messages);

    res.status(200).json({ 
      message: 'Message sent and agent processing started',
      threadId,
      userMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a thread
threadRouter.delete('/:threadId', async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.threadId);
    await prisma.thread.delete({
      where: { id: threadId }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function processAgentResponse(threadId: number, userMessage: string, previousMessages: Message[]) {
  try {
    // Get thread with agent and extensions
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        agent: {
          include: {
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
            },
            extensions: {
              include: { extension: true }
            }
          }
        }
      }
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Load extensions
    const extensionsMap = new Map<string, Extension>();
    
    // Load agent-specific extensions
    for (const ext of thread.agent.extensions) {
      if (ext.enabled) {
        const extension = await loadExtension(ext.extension.name);
        if (extension) {
          extensionsMap.set(ext.extension.name, extension);
        }
      }
    }

    // Load workspace extensions
    for (const wa of thread.agent.workspaces) {
      if (wa.useAllExtensions) {
        for (const ext of wa.workspace.extensions) {
          if (ext.enabled && !extensionsMap.has(ext.extension.name)) {
            const extension = await loadExtension(ext.extension.name);
            if (extension) {
              extensionsMap.set(ext.extension.name, extension);
            }
          }
        }
      }
    }

    const extensions = Array.from(extensionsMap.values());

    // Initialize agent
    const agentInstance = new Agent(
      extensions,
      {
        onMessage: async (message: any) => {
          const role = isValidRole(message.role) ? message.role : 'assistant';
          await prisma.message.create({
            data: {
              threadId,
              role,
              content: message.content
            }
          });
        },
        onComplete: async () => {
          await prisma.agent.update({
            where: { id: thread.agent.id },
            data: { status: 'completed' }
          });
        },
        onError: async (error: Error) => {
          console.error(error);
          await prisma.agent.update({
            where: { id: thread.agent.id },
            data: { status: 'failed' }
          });
        }
      },
      process.env.LLM_MODEL || 'gpt-4o',
      0,
      undefined,
      thread.agent.description || undefined
    );

    // Execute agent with conversation history
    await agentInstance.execute(userMessage, previousMessages);
  } catch (error) {
    console.error('Error processing agent response:', error);
    throw error;
  }
}

export default threadRouter; 