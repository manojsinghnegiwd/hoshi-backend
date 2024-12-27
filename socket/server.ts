import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { SocketHandler } from './handler';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types';

export function setupSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Middleware for error handling
  io.use((socket, next) => {
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    next();
  });

  // Handle new connections
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Initialize socket handler for this connection
    new SocketHandler(socket);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
} 