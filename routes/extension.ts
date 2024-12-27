import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();
const extensionRouter = express.Router();

// Create a new extension
extensionRouter.post('/', async (req: Request, res: Response) => {
  try {
    const extension = await prisma.extension.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        version: req.body.version || '1.0.0',
        config: req.body.config || {}
      }
    });
    res.status(201).json(extension);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all extensions
extensionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const extensions = await prisma.extension.findMany({
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        },
        agents: {
          include: {
            agent: true
          }
        }
      }
    });
    res.status(200).json(extensions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific extension
extensionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const extensionId = parseInt(req.params.id);
    const extension = await prisma.extension.findUnique({
      where: { id: extensionId },
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        },
        agents: {
          include: {
            agent: true
          }
        }
      }
    });

    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    res.status(200).json(extension);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an extension
extensionRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const extensionId = parseInt(req.params.id);
    const extension = await prisma.extension.update({
      where: { id: extensionId },
      data: {
        name: req.body.name,
        description: req.body.description,
        version: req.body.version,
        config: req.body.config
      }
    });
    res.status(200).json(extension);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an extension
extensionRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const extensionId = parseInt(req.params.id);
    await prisma.extension.delete({
      where: { id: extensionId }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get extension tools
extensionRouter.get('/:id/tools', async (req: Request, res: Response) => {
  try {
    const extensionId = parseInt(req.params.id);
    const extension = await prisma.extension.findUnique({
      where: { id: extensionId }
    });

    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    try {
      const extensionModule = await import(path.join('../extensions', extension.name));
      res.status(200).json({
        name: extension.name,
        tools: extensionModule.default.tools
      });
    } catch (error) {
      console.error(`Failed to load extension ${extension.name}:`, error);
      res.status(500).json({ error: 'Failed to load extension tools' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available extension directories
extensionRouter.get('/available/list', async (req: Request, res: Response) => {
  try {
    const extensionsDir = path.join(process.cwd(), 'extensions');
    const entries = await fs.readdir(extensionsDir, { withFileTypes: true });
    
    const availableExtensions = entries
      .filter(entry => entry.isDirectory())
      .map(dir => dir.name);

    res.status(200).json(availableExtensions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test an extension
extensionRouter.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const extensionId = parseInt(req.params.id);
    const extension = await prisma.extension.findUnique({
      where: { id: extensionId }
    });

    if (!extension) {
      res.status(404).json({ error: 'Extension not found' });
      return;
    }

    try {
      const extensionModule = await import(path.join('../extensions', extension.name));
      const testResult = await extensionModule.default.test?.(req.body.input);
      res.status(200).json({
        success: true,
        result: testResult
      });
    } catch (error) {
      console.error(`Failed to test extension ${extension.name}:`, error);
      res.status(500).json({ error: 'Failed to test extension' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default extensionRouter; 