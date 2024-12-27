import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export interface ServerToClientEvents {
  'thread:message': (message: ThreadMessage) => void;
  'thread:message:stream': (data: StreamChunk) => void;
  'thread:message:complete': (messageId: number) => void;
  'thread:status': (status: ThreadStatus) => void;
  'thread:update': (data: { id: number; name: string }) => void;
  'thread:tool:start': (data: ToolExecution) => void;
  'error': (error: string) => void;
}

export interface ClientToServerEvents {
  'thread:create': (data: CreateThreadData, callback: (response: ThreadResponse) => void) => void;
  'thread:join': (threadId: number) => void;
  'thread:leave': (threadId: number) => void;
  'thread:message:send': (data: SendMessageData, callback: (response: MessageResponse) => void) => void;
}

export interface ThreadMessage {
  id: number;
  threadId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface StreamChunk {
  messageId: number;
  threadId: number;
  chunk: string;
  done: boolean;
}

export interface ToolExecution {
  messageId: number;
  threadId: number;
  explanation: string;
}

export interface ThreadStatus {
  threadId: number;
  status: 'typing' | 'idle';
}

export interface CreateThreadData {
  agentId: number;
}

export interface ThreadResponse {
  success: boolean;
  thread?: {
    id: number;
    name: string;
    messages: ThreadMessage[];
  };
  error?: string;
}

export interface SendMessageData {
  threadId: number;
  content: string;
}

export interface MessageResponse {
  success: boolean;
  message?: ThreadMessage;
  error?: string;
}

export interface SocketData {
  activeThreads: Set<number>;
}

export type SocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>; 