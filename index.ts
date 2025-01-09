import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import agentRouter from './routes/agent';
import workspaceRouter from './routes/workspace';
import threadRouter from './routes/thread';
import extensionRouter from './routes/extension';
import { setupSocketServer } from './socket/server';
import schedulerRouter from './routes/scheduler';

const app = express();
const httpServer = createServer(app);
const port = 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/agent', agentRouter);
app.use('/workspace', workspaceRouter);
app.use('/thread', threadRouter);
app.use('/extension', extensionRouter);
app.use('/scheduler', schedulerRouter);

// Setup WebSocket server
setupSocketServer(httpServer);

// Start server
httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});