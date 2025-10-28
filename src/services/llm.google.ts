import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export type ModelRef = { 
  provider: 'google'; 
  name: string; 
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Array<{
    type: 'image' | 'audio' | 'pdf';
    data: string; // base64 or URL
  }>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any; // JSON Schema
}

export interface LLMStreamOptions {
  tools?: ToolDefinition[];
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: ToolCall) => Promise<any>;
  onError?: (error: Error) => void;
  onDone?: (finalResponse: string) => void;
}

class GoogleGenAIService {
  private client: GoogleGenerativeAI;
  private models: Map<string, GenerativeModel> = new Map();

  constructor() {
    this.client = new GoogleGenerativeAI(env.GOOGLE_GENAI_API_KEY);
  }

  private getModel(modelName: string, tools?: any[]): GenerativeModel {
    const cacheKey = tools ? `${modelName}:with-tools` : modelName;
    if (!this.models.has(cacheKey)) {
      this.models.set(cacheKey, this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
        },
        tools: tools ? [{ functionDeclarations: tools }] : undefined
      }));
    }
    return this.models.get(cacheKey)!;
  }

  private convertMessagesToGeminiFormat(messages: ChatMessage[]): Content[] {
    return messages.map(msg => {
      const parts: Part[] = [{ text: msg.content }];
      
      // Add attachments if present
      if (msg.attachments) {
        for (const attachment of msg.attachments) {
          if (attachment.type === 'image') {
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg', // Default, should be determined from actual file
                data: attachment.data,
              }
            });
          }
        }
      }
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
  }

  private convertToolsToGeminiFormat(tools: ToolDefinition[]): any[] {
    return tools.map(tool => ({
      functionDeclaration: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }
    }));
  }

  async callLLM(
    model: ModelRef, 
    messages: ChatMessage[], 
    options: LLMStreamOptions = {}
  ): Promise<string> {
    try {
      const tools = options.tools ? this.convertToolsToGeminiFormat(options.tools) : undefined;
      const generativeModel = this.getModel(model.name, tools);
      const contents = this.convertMessagesToGeminiFormat(messages);
      
      const result = await generativeModel.generateContent({
        contents,
      });
      
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      logger.error({ error, model: model.name }, 'LLM call failed');
      throw error;
    }
  }

  async callLLMStream(
    model: ModelRef, 
    messages: ChatMessage[], 
    options: LLMStreamOptions = {}
  ): Promise<void> {
    try {
      const tools = options.tools ? this.convertToolsToGeminiFormat(options.tools) : undefined;
      const generativeModel = this.getModel(model.name, tools);
      const contents = this.convertMessagesToGeminiFormat(messages);
      
      logger.debug({ 
        model: model.name, 
        messageCount: messages.length,
        hasTools: !!tools 
      }, 'Calling LLM stream');
      
      const stream = await generativeModel.generateContentStream({
        contents,
      });
      
      let fullResponse = '';
      
      for await (const chunk of stream.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          options.onToken?.(chunkText);
        }
        
        // Handle function calls if present
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const functionCall of chunk.functionCalls) {
            const toolCall: ToolCall = {
              name: functionCall.name,
              arguments: functionCall.args || {},
            };
            
            try {
              const result = await options.onToolCall?.(toolCall);
              // Note: In a real implementation, you'd need to handle tool results
              // and continue the conversation with the tool results
            } catch (error) {
              logger.error({ error, toolCall }, 'Tool call failed');
              options.onError?.(error as Error);
            }
          }
        }
      }
      
      logger.info({ 
        model: model.name, 
        responseLength: fullResponse.length 
      }, 'LLM stream completed successfully');
      
      options.onDone?.(fullResponse);
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack,
        status: error?.status,
        statusText: error?.statusText,
        response: error?.response?.data,
      };
      logger.error({ error: errorDetails, model: model.name }, 'LLM stream call failed');
      options.onError?.(error as Error);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error({ error }, 'Embedding generation failed');
      throw error;
    }
  }
}

export const googleGenAIService = new GoogleGenAIService();

// Convenience functions
export async function callLLM(
  model: ModelRef, 
  messages: ChatMessage[], 
  options: LLMStreamOptions = {}
): Promise<string> {
  return googleGenAIService.callLLM(model, messages, options);
}

export async function callLLMStream(
  model: ModelRef, 
  messages: ChatMessage[], 
  options: LLMStreamOptions = {}
): Promise<void> {
  return googleGenAIService.callLLMStream(model, messages, options);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return googleGenAIService.generateEmbedding(text);
}
