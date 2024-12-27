import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { CompiledStateGraph, StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation, messagesStateReducer } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Define base state shape
const BaseStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  })
});

export interface Extension {
  name: string;
  description: string;
  type: string;
  tools: Tool[];
}

export interface AgentHooks {
  onStart?: (input: string) => Promise<void>;
  onToken?: (token: string, isToolCall?: boolean) => Promise<void>;
  onMessage?: (message: BaseMessage) => Promise<void>;
  onComplete?: (result: any) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
  onToolStart?: (explanation: string) => Promise<void>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class Agent {
  protected tools: Tool[];
  protected model: any;
  protected app!: CompiledStateGraph<any, any, any, any, any, any>;
  protected stateAnnotation: any;
  protected extensions: Extension[];
  protected hooks: AgentHooks;
  protected systemPrompt: string;
  protected isExecutingTool: boolean = false;

  constructor(
    extensions: Extension[] = [],
    hooks: AgentHooks = {},
    modelName: string = process.env.LLM_MODEL || 'gpt-4o',
    temperature: number = 0,
    stateAnnotation = BaseStateAnnotation,
    agentDescription?: string
  ) {
    this.extensions = extensions;
    this.hooks = hooks;
    this.stateAnnotation = stateAnnotation;
    this.systemPrompt = (
      agentDescription || "You are a helpful AI assistant."
    );

    // Collect all tools from extensions
    this.tools = extensions.reduce((allTools: Tool[], ext) => {
      return allTools.concat(ext.tools);
    }, []);

    // Initialize the model with tools and streaming
    const chatModel = new ChatOpenAI({
      modelName,
      temperature,
      streaming: true,
    });
    this.model = chatModel.bindTools(this.tools);

    this.setupWorkflow();
  }

  protected async callModel(state: any) {
    this.isExecutingTool = false;
    const messages = state.messages;
    const response = await this.model.invoke(messages);
    
    if (response.tool_calls?.length) {
      this.isExecutingTool = true;
      const toolCall = response.tool_calls[0];
      
      // Find the tool and its description
      const tool = this.tools.find(t => {
        return t.name === toolCall.name;
      });

      if (tool && this.hooks.onToolStart) {
        // Create explanation using GPT-3.5
        const explainer = new ChatOpenAI({
          modelName: "gpt-3.5-turbo",
          temperature: 0
        });

        const prompt = `Given this tool call:
Tool: ${tool.name}
Description: ${tool.description}
Arguments: ${JSON.stringify(toolCall.args, null, 2)}

Write a brief, first-person explanation of what you're doing (start with "I am"). Keep it natural and conversational, focusing on the action being taken rather than technical details. Keep it short and concise under 20 words.`;

        const explanation = await explainer.invoke([new HumanMessage(prompt)]);
        await this.hooks.onToolStart(explanation.content as string);
      }
    }
    
    return { messages: [response] };
  }

  protected shouldContinue(state: any) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls?.length) {
      return "tools";
    }

    return "__end__";
  }

  protected setupWorkflow() {
    const workflow = new StateGraph(this.stateAnnotation)
      .addNode("agent", this.callModel.bind(this))
      .addNode("tools", new ToolNode(this.tools))
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", this.shouldContinue.bind(this))
      .addEdge("tools", "agent");

    this.app = workflow.compile({
      checkpointer: new MemorySaver()
    });

    if (!this.app) {
      throw new Error('Failed to initialize workflow');
    }
  }

  protected formatMessage(message: Message): BaseMessage {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'user':
        return new HumanMessage(message.content);
      case 'assistant':
        return new AIMessage(message.content);
      default:
        throw new Error(`Invalid message role: ${message.role}`);
    }
  }

  async execute(input: string, conversationHistory: Message[] = []) {
    if (!this.app) {
      throw new Error('Workflow not initialized');
    }

    try {
      // Add logging for initial input
      console.log('Initial Input:', input);

      if (this.hooks.onStart) {
        await this.hooks.onStart(input);
      }

      const formattedMessages: BaseMessage[] = [
        new SystemMessage(this.systemPrompt),
        ...conversationHistory.map(msg => this.formatMessage(msg)),
        new HumanMessage(input)
      ];

      let finalState: any;

      for await (const [mode, metadata] of await this.app.stream(
        { messages: formattedMessages },
        { streamMode: ["messages", "values"], configurable: { thread_id: crypto.randomUUID() } }
      )) {
        if (mode === "messages") {
          const messageData = metadata?.[0] as AIMessageChunk;

          if (this.hooks.onToken && metadata?.[1]?.langgraph_node === 'agent') {
            await this.hooks.onToken(messageData?.content as string);
          }
        } else if (mode === "values") {
          finalState = metadata;

          if (this.hooks.onMessage) {
            await this.hooks.onMessage(finalState?.messages[finalState?.messages.length - 1]);
          }
        }
      }

      // Call onComplete hook if provided
      if (this.hooks.onComplete) {
        await this.hooks.onComplete(finalState);
      }

      return {
        messages: finalState?.messages,
        state: finalState
      };
    } catch (error) {
      console.error('Execution Error:', error);
      if (this.hooks.onError) {
        await this.hooks.onError(error as Error);
      }
      throw error;
    }
  }

  // Helper method to get available extensions
  getExtensions(): Extension[] {
    return this.extensions;
  }

  // Helper method to get all available tools
  getTools(): Tool[] {
    return this.tools;
  }
} 