import OpenAIApi from 'openai';
import { AIProvider, AIRequest, AIResponse, Message } from '../types';

export class OpenAIProvider implements AIProvider {
  private client: OpenAIApi;

  constructor() {
    this.client = new OpenAIApi({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const messages: Message[] = [];
    const now = new Date();

    if (request.systemPrompt) {
      messages.push({ 
        role: 'system', 
        content: request.systemPrompt,
        timestamp: now
      });
    }

    if (request.history) {
      messages.push(...request.history.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
        timestamp: msg.timestamp || now,
        function_call: msg.function_call,
        tool_calls: msg.tool_calls
      })));
    }

    if (request.prompt) {
      messages.push({ 
        role: 'user', 
        content: request.prompt,
        timestamp: now
      });
    }

    const completion = await this.client.chat.completions.create({
      model: request.model || 'gpt-4o',
      messages: messages.map(({ timestamp, ...msg }) => msg), // Remove timestamp for OpenAI API
      temperature: request.temperature || 1,
    });

    const response: AIResponse = {
      content: completion.choices[0].message.content || '',
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      history: messages.concat({
        role: 'assistant',
        content: completion.choices[0].message.content || '',
        timestamp: new Date(),
      })
    };

    return response;
  }
}