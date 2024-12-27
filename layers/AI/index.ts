import { OpenAIProvider } from './providers/OpenAIProvider';
import { LangChainProvider } from './providers/LangChainProvider';
import { AIProvider, AIRequest, AIResponse } from './types';

export class AI {
  private static providers: Map<string, AIProvider> = new Map();

  static {
    AI.providers.set('openai', new OpenAIProvider());
    AI.providers.set('langchain', new LangChainProvider());
  }

  static async generate(request: AIRequest): Promise<AIResponse> {
    const provider = AI.providers.get(request.provider || 'langchain');
    if (!provider) {
      throw new Error(`Provider ${request.provider} not found`);
    }
    return provider.generate(request);
  }
}

export * from './types';
