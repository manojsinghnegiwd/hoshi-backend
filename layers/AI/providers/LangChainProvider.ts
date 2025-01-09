import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { Tool } from "@langchain/core/tools";
import { 
  AgentExecutor, 
  createOpenAIFunctionsAgent, 
  type AgentStep 
} from "langchain/agents";
import { 
  ChatPromptTemplate, 
  MessagesPlaceholder 
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIProvider, AIRequest, AIResponse, Message } from '../types';
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export class LangChainProvider implements AIProvider {
  private model: any;
  private tools: Map<string, Tool>;

  constructor() {
    this.model = this.initializeLLM();
    this.tools = this.initializeTools();
  }

  private initializeLLM(): any {
    const provider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
    const apiKey = process.env.LLM_API_KEY;

    if (!apiKey) {
      throw new Error('LLM API key not provided');
    }

    switch (provider) {
      case 'openai':
        return new ChatOpenAI({ 
          openAIApiKey: apiKey,
          modelName: process.env.LLM_MODEL || 'gpt-4o',
          temperature: 0.7,
        });
      case 'claude':
        return new ChatAnthropic({ 
          anthropicApiKey: apiKey,
          modelName: process.env.LLM_MODEL || 'claude-2',
          temperature: 0.7,
        });
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private initializeTools(): Map<string, Tool> {
    const tools = new Map<string, Tool>();
    tools.set('tavily', new TavilySearchResults({
      apiKey: process.env.TAVILY_API_KEY,
    }));
    return tools;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    try {
      if (request.chainType === 'agent') {
        const selectedTools = request.tools?.map(toolName => {
          const tool = this.tools.get(toolName);
          if (!tool) throw new Error(`Tool ${toolName} not found`);
          return tool;
        }) || [];

        const prompt = ChatPromptTemplate.fromMessages([
          ["system", "You are a helpful AI assistant."],
          ["human", "{input}"],
          new MessagesPlaceholder("agent_scratchpad"),
        ]);

        const agent = await createOpenAIFunctionsAgent({
          llm: this.model,
          tools: selectedTools,
          prompt,
        });

        const agentExecutor = new AgentExecutor({
          agent,
          tools: selectedTools,
          returnIntermediateSteps: true,
        });

        const { output, intermediateSteps } = await agentExecutor.invoke({
          input: request.prompt,
        }) as { output: string; intermediateSteps: AgentStep[] };

        return {
          content: output,
          model: `langchain-agent-${(this.model as any).modelName || 'unknown'}`,
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          }
        };
      }

      if (!request.prompt && !request.promptTemplate && !request.history) {
        throw new Error('Either prompt, promptTemplate, or history must be provided');
      }

      let content: string;
      const now = new Date();
      const history: Message[] = [...(request.history || [])];

      if (request.history) {
        const messages = [
          ...(request.systemPrompt ? [new SystemMessage(request.systemPrompt)] : []),
          ...request.history.map(msg => {
            switch (msg.role) {
              case 'user':
                return new HumanMessage(msg.content);
              case 'assistant':
                return new AIMessage(msg.content);
              case 'system':
                return new SystemMessage(msg.content);
              default:
                throw new Error(`Invalid message role: ${msg.role}`);
            }
          }),
          ...(request.prompt ? [new HumanMessage(request.prompt)] : [])
        ];

        const chain = RunnableSequence.from([
          this.model,
          new StringOutputParser()
        ]);

        content = await chain.invoke(messages);

        if (request.prompt) {
          history.push({
            role: 'user',
            content: request.prompt,
            timestamp: now
          });
        }
      } else if (request.chainType === 'structured') {
        const promptTemplate = PromptTemplate.fromTemplate(
          request.promptTemplate || request.prompt
        );
        
        const chain = RunnableSequence.from([
          promptTemplate,
          this.model,
          new StringOutputParser()
        ]);

        content = await chain.invoke(request.variables || {});
      } else {
        const promptText = request.promptTemplate
          ? await ChatPromptTemplate.fromTemplate(request.promptTemplate)
              .format(request.variables || {})
          : request.prompt;
        
        const chain = RunnableSequence.from([
          this.model,
          new StringOutputParser()
        ]);
        
        content = await chain.invoke(promptText);
      }

      if (!content) {
        throw new Error('No content generated from AI model');
      }

      return {
        content,
        model: `langchain-${(this.model as any).modelName || 'unknown'}`,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        history: [
          ...history,
          {
            role: 'assistant',
            content,
            timestamp: new Date()
          }
        ]
      };
    } catch (error) {
      throw new Error(`LangChain generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}