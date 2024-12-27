import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Agent, Extension } from '../agent';
import path from 'path';

const prisma = new PrismaClient();
const agentRouter = express.Router();
async function loadExtension(name: string): Promise<Extension | null> {
  try {
    const extensionModule = await import(path.join('../extensions', name));
    return extensionModule.default;
  } catch (error) {
    console.error(`Failed to load extension ${name}:`, error);
    return null;
  }
}

// POST create new agent
agentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        workspaces: req.body.workspaceId ? {
          create: {
            workspaceId: req.body.workspaceId,
            useAllExtensions: true
          }
        } : undefined,
      }
    });
    res.status(201).json(agent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all agents
agentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany();
    res.status(200).json(agents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET specific agent
agentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        },
        extensions: {
          include: {
            extension: true
          }
        }
      }
    });

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.status(200).json(agent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update agent
agentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        name: req.body.name,
        description: req.body.description,
      }
    });
    res.status(200).json(agent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE agent
agentRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);
    await prisma.agent.delete({
      where: { id: agentId }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST start agent run
agentRouter.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.id);

    // Get agent with its workspace and extension relationships
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
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
    });

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Get all applicable extensions
    const extensionsMap = new Map<string, Extension>();
    
    // Load agent-specific extensions first (these take precedence)
    for (const ext of agent.extensions) {
      if (ext.enabled) {
        const extension = await loadExtension(ext.extension.name);
        if (extension) {
          extensionsMap.set(ext.extension.name, extension);
        }
      }
    }

    // Load workspace extensions if useAllExtensions is true
    for (const wa of agent.workspaces) {
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

    // Convert Map values to array
    const extensions: Extension[] = Array.from(extensionsMap.values());

    // Define hooks for agent lifecycle
    const hooks = {
      onStart: async (input: string) => {
        await prisma.agent.update({
          where: { id: agentId },
          data: { 
            status: 'running',
            lastRun: new Date()
          }
        });
      },
      onMessage: async (message: any) => {
        await prisma.message.create({
          data: {
            threadId: message.threadId || 1,
            role: message.role || 'assistant',
            content: message.content
          }
        });
      },
      onComplete: async (result: any) => {
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: 'completed' }
        });
      },
      onError: async (error: Error) => {
        console.error(error);
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: 'failed' }
        });
      }
    };

    // Initialize agent with collected extensions and hooks
    const agentInstance = new Agent(extensions, hooks);
    
    // Start execution asynchronously
    agentInstance.execute(req.body.input || '');

    res.status(200).json({ 
      message: 'Agent execution started',
      agentId,
      status: 'running'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default agentRouter;

