import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { Agent, AgentHooks, Extension } from '../agent';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, isAIMessageChunk } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import path from 'path';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  ThreadMessage
} from './types';

const prisma = new PrismaClient();

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

export class SocketHandler {
  private socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
  private currentMessageId: number | null = null;

  constructor(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) {
    this.socket = socket;
    this.socket.data.activeThreads = new Set();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('thread:create', this.handleThreadCreate.bind(this));
    this.socket.on('thread:join', this.handleThreadJoin.bind(this));
    this.socket.on('thread:leave', this.handleThreadLeave.bind(this));
    this.socket.on('thread:message:send', this.handleMessageSend.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
  }

  private emitToRoom(threadId: number, event: keyof ServerToClientEvents, data: any) {
    // Emit to the sender
    this.socket.emit(event, data);
    // Emit to others in the room
    this.socket.broadcast.to(`thread:${threadId}`).emit(event, data);
  }

  private async handleThreadCreate(data: { agentId: number }, callback: (response: any) => void) {
    try {
      // Check if agent exists
      const agent = await prisma.agent.findUnique({
        where: { id: data.agentId }
      });

      if (!agent) {
        callback({ success: false, error: 'Agent not found' });
        return;
      }

      // Create new thread with initial assistant message
      const thread = await prisma.thread.create({
        data: {
          agentId: data.agentId,
          name: `Thread ${new Date().toISOString()}`,
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

      // Join the socket to the thread's room
      this.socket.join(`thread:${thread.id}`);
      this.socket.data.activeThreads.add(thread.id);

      callback({
        success: true,
        thread: {
          id: thread.id,
          name: thread.name,
          messages: thread.messages.map(msg => ({
            ...msg,
            role: isValidRole(msg.role) ? msg.role : 'system'
          }))
        }
      });
    } catch (error) {
      console.error('Error creating thread:', error);
      callback({ success: false, error: 'Failed to create thread' });
    }
  }

  private async handleThreadJoin(threadId: number) {
    try {
      const thread = await prisma.thread.findUnique({
        where: { id: threadId }
      });

      if (!thread) {
        this.socket.emit('error', 'Thread not found');
        return;
      }

      this.socket.join(`thread:${threadId}`);
      this.socket.data.activeThreads.add(threadId);
    } catch (error) {
      console.error('Error joining thread:', error);
      this.socket.emit('error', 'Failed to join thread');
    }
  }

  private handleThreadLeave(threadId: number) {
    this.socket.leave(`thread:${threadId}`);
    this.socket.data.activeThreads.delete(threadId);
  }

  private async handleMessageSend(data: { threadId: number; content: string }, callback: (response: any) => void) {
    try {
      const thread = await prisma.thread.findUnique({
        where: { id: data.threadId },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!thread) {
        callback({ success: false, error: 'Thread not found' });
        return;
      }

      // Create user message
      const message = await prisma.message.create({
        data: {
          threadId: data.threadId,
          role: 'user' as const,
          content: data.content
        }
      });

      // If this is the first user message, generate a thread name using OpenAI
      if (thread.messages.length === 1) {
        const chatModel = new ChatOpenAI({
          modelName: "gpt-3.5-turbo",
          temperature: 0
        });

        const response = await chatModel.invoke([
          new SystemMessage("Generate a concise thread name (max 50 chars) based on the user's first message. Respond with just the name, no quotes or extra text."),
          new HumanMessage(data.content)
        ]);

        const updatedThread = await prisma.thread.update({
          where: { id: data.threadId },
          data: { name: response.content.slice(0, 50) as string }
        });

        // Emit thread update to all clients in the room
        this.emitToRoom(data.threadId, 'thread:update', {
          id: updatedThread.id,
          name: updatedThread.name
        });
      }

      const threadMessage: ThreadMessage = {
        id: message.id,
        threadId: message.threadId,
        role: 'user',
        content: message.content,
        createdAt: message.createdAt
      };

      // Emit to all clients in the room including sender
      this.emitToRoom(data.threadId, 'thread:message', threadMessage);

      callback({ success: true, message: threadMessage });

      // Process agent response
      const validMessages = thread.messages.map(msg => ({
        ...msg,
        role: isValidRole(msg.role) ? msg.role : 'system'
      })) as ThreadMessage[];

      await this.processAgentResponse(data.threadId, data.content, validMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      callback({ success: false, error: 'Failed to send message' });
    }
  }

  private async processAgentResponse(threadId: number, userMessage: string, previousMessages: ThreadMessage[]) {
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

      // Emit typing status to all clients in the room
      this.emitToRoom(threadId, 'thread:status', {
        threadId,
        status: 'typing'
      });

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

      // Create an empty message to start streaming
      const initialMessage = await prisma.message.create({
        data: {
          threadId,
          role: 'assistant',
          content: ''
        }
      });

      let streamContent = '';

      // Initialize agent with description as system prompt
      const agentInstance = new Agent(
        extensions,
        {
          onToken: async (token: string, isToolCall: boolean = false) => {
            if (!isToolCall) {
              streamContent += token;
              // Emit the token to all clients in the room
              this.emitToRoom(threadId, 'thread:message:stream', {
                messageId: initialMessage.id,
                threadId,
                chunk: token,
                done: false
              });
            }
          },
          onToolStart: async (explanation: string) => {
            // Emit tool start event
            this.socket.emit('thread:tool:start', {
              messageId: initialMessage.id,
              threadId,
              explanation
            });
          },
          onMessage: async (message: any) => {
            if (!message.content || !isAIMessageChunk(message)) {
              return;
            }
            
            const content = Array.isArray(message.content) 
              ? message.content.map(c => 'text' in c ? c.text : '').join('')
              : message.content;

            // Update the message with the complete content
            const agentMessage = await prisma.message.update({
              where: { id: initialMessage.id },
              data: {
                content: String(content)
              }
            });

            const threadMessage: ThreadMessage = {
              id: agentMessage.id,
              threadId: agentMessage.threadId,
              role: 'assistant',
              content: agentMessage.content,
              createdAt: agentMessage.createdAt
            };

            // Emit completion to all clients
            this.emitToRoom(threadId, 'thread:message:complete', agentMessage.id);
            this.emitToRoom(threadId, 'thread:message', threadMessage);
          },
          onComplete: async () => {
            await prisma.agent.update({
              where: { id: thread.agent.id },
              data: { status: 'completed' }
            });

            // Emit idle status to all clients in the room
            this.emitToRoom(threadId, 'thread:status', {
              threadId,
              status: 'idle'
            });
          },
          onError: async (error: Error) => {
            console.error(error);
            await prisma.agent.update({
              where: { id: thread.agent.id },
              data: { status: 'failed' }
            });

            this.emitToRoom(threadId, 'error', 'Agent processing failed');
          }
        },
        process.env.LLM_MODEL || 'gpt-4o',
        0,
        undefined,
        thread.agent.description || undefined
      );

      // Convert ThreadMessage[] to Message[] for agent execution
      const messages = previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Execute agent with conversation history
      await agentInstance.execute(userMessage, messages);
    } catch (error) {
      console.error('Error processing agent response:', error);
      this.emitToRoom(threadId, 'error', 'Failed to process agent response');
    }
  }

  private handleDisconnect() {
    // Leave all active threads
    for (const threadId of this.socket.data.activeThreads) {
      this.socket.leave(`thread:${threadId}`);
    }
    this.socket.data.activeThreads.clear();
  }
} 