import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';
import SchedulerService from '../services/scheduler/scheduler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const schedulerRouter = express.Router();
const scheduler = SchedulerService.getInstance();

// Schema for creating a schedule
const createScheduleSchema = z.object({
  body: z.object({
    agentId: z.number(),
    type: z.enum(['INTERVAL', 'CRON', 'FIXED']),
    interval: z.number().optional(),
    cronExpression: z.string().optional(),
    fixedTime: z.string().optional(), // ISO date string
    timezone: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// Create a new schedule
schedulerRouter.post(
  '/',
  validateRequest(createScheduleSchema),
  async (req, res) => {
    try {
      const schedule = await scheduler.createSchedule({
        ...req.body,
        fixedTime: req.body.fixedTime ? new Date(req.body.fixedTime) : undefined,
      });
      res.json(schedule);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

// Get all schedules with optional filters
schedulerRouter.get('/', async (req, res) => {
  try {
    const filters: any = {};
    if (req.query.enabled !== undefined) {
      filters.enabled = req.query.enabled === 'true';
    }
    if (req.query.agentId) {
      filters.agentId = parseInt(req.query.agentId as string);
    }

    const schedules = await scheduler.listSchedules(filters);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific schedule
schedulerRouter.get('/:id', async (req, res) => {
  try {
    const schedule = await scheduler.getSchedule(parseInt(req.params.id));
    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get schedule runs
schedulerRouter.get('/:id/runs', async (req, res) => {
  try {
    const schedule = await scheduler.getSchedule(parseInt(req.params.id));
    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    res.json(schedule.runs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause a schedule
schedulerRouter.post('/:id/pause', async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const updatedSchedule = await scheduler.pauseSchedule(schedule.id, schedule.jobId);
    res.json(updatedSchedule);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Resume a schedule
schedulerRouter.post('/:id/resume', async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    const updatedSchedule = await scheduler.resumeSchedule(schedule.id);
    res.json(updatedSchedule);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a schedule
schedulerRouter.delete('/:id', async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }

    await scheduler.deleteSchedule(schedule.id, schedule.jobId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default schedulerRouter; 