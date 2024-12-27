import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workspaceRouter = express.Router();

// Create a new workspace
workspaceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: req.body.name,
        description: req.body.description,
      }
    });
    res.status(201).json(workspace);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all workspaces
workspaceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workspaces = await prisma.workspace.findMany();
    res.status(200).json(workspaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific workspace
workspaceRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        agents: {
          include: { agent: true }
        },
        extensions: {
          include: { extension: true }
        }
      }
    });

    if (!workspace) {
        res.status(404).json({ error: 'Workspace not found' });
        return;
    }

    res.status(200).json(workspace);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a workspace
workspaceRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: req.body.name,
        description: req.body.description,
      }
    });
    res.status(200).json(workspace);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a workspace
workspaceRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    await prisma.workspace.delete({
      where: { id: workspaceId }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add an extension to workspace
workspaceRouter.post('/:id/extension', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const extensionId = req.body.extensionId;
    
    const workspaceExtension = await prisma.workspaceExtension.create({
      data: {
        workspaceId,
        extensionId,
        config: req.body.config,
        enabled: req.body.enabled ?? true,
      },
      include: {
        extension: true
      }
    });
    
    res.status(201).json(workspaceExtension);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove an extension from workspace
workspaceRouter.delete('/:workspaceId/extension/:extensionId', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const extensionId = parseInt(req.params.extensionId);
    
    await prisma.workspaceExtension.delete({
      where: {
        workspaceId_extensionId: {
          workspaceId,
          extensionId
        }
      }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add an agent to workspace
workspaceRouter.post('/:id/agent', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const agentId = req.body.agentId;
    
    const workspaceAgent = await prisma.workspaceAgent.create({
      data: {
        workspaceId,
        agentId,
        config: req.body.config,
        useAllExtensions: req.body.useAllExtensions ?? true,
      },
      include: {
        agent: true
      }
    });
    
    res.status(201).json(workspaceAgent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove an agent from workspace
workspaceRouter.delete('/:workspaceId/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const agentId = parseInt(req.params.agentId);
    
    await prisma.workspaceAgent.delete({
      where: {
        workspaceId_agentId: {
          workspaceId,
          agentId
        }
      }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all extensions in a workspace
workspaceRouter.get('/:id/extension', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const extensions = await prisma.workspaceExtension.findMany({
      where: { workspaceId },
      include: {
        extension: true
      }
    });
    res.status(200).json(extensions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all agents in a workspace
workspaceRouter.get('/:id/agent', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const agents = await prisma.workspaceAgent.findMany({
      where: { workspaceId },
      include: {
        agent: true
      }
    });
    res.status(200).json(agents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default workspaceRouter; 