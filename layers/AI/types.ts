export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  history?: Message[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  name?: string;
  function_call?: any;
  tool_calls?: any[];
}

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  provider?: 'openai' | 'anthropic' | 'langchain' | 'claude';
  llmProvider?: string;  // Override environment-based provider
  promptTemplate?: string;
  variables?: Record<string, any>;
  chainType?: 'simple' | 'structured' | 'conversation' | 'agent';
  tools?: string[];  // Names of tools to use
  history?: Message[];
  systemPrompt?: string;
}

export interface StructuredOutput {
  schema: Record<string, any>;
  data: any;
}

export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}