import { Agent } from '../db/models';
import { getAgentConfig } from '../agents/config';
import { callLLMStream, ChatMessage, ModelRef } from './llm.google';
import { retrievalService, RetrievalResult } from './retrieval';
import { outputGateService } from './output-gate';
import { logger } from '../utils/logger';

export interface ChatRequest {
  conversationId: string;
  agentKey: string;
  text: string;
  attachmentIds?: string[];
  userId: string;
}

export interface ChatResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export class ChatOrchestrator {
  async processChatRequest(request: ChatRequest): Promise<ChatResponse> {
    try {
      logger.info({ 
        conversationId: request.conversationId,
        agentKey: request.agentKey,
        userId: request.userId 
      }, 'Processing chat request');

      // Get agent configuration
      const agentConfig = getAgentConfig(request.agentKey);
      if (!agentConfig) {
        return {
          success: false,
          error: `Agent '${request.agentKey}' not found`
        };
      }

      // Load agent from database for additional context
      const agent = await Agent.findOne({ key: request.agentKey });
      if (!agent) {
        return {
          success: false,
          error: `Agent '${request.agentKey}' not configured in database`
        };
      }

      // Perform retrieval to get relevant context
      let retrievalResults: RetrievalResult[] = [];
      let contextText = '';
      
      try {
        retrievalResults = await retrievalService.search(request.text, {
          collections: agentConfig.retrieval.collections,
          topK: agentConfig.retrieval.topK,
          minScore: 0.7 // Only include high-confidence results
        });

        if (retrievalResults.length > 0) {
          contextText = this.buildContextFromRetrieval(retrievalResults);
          logger.info({ 
            retrievalCount: retrievalResults.length,
            contextLength: contextText.length 
          }, 'Retrieval context built');
        } else {
          logger.warn({ agentKey: request.agentKey }, 'No retrieval results found');
        }
      } catch (error) {
        logger.error({ error }, 'Retrieval failed, continuing without context');
      }

      // Build conversation history with context
      const systemPrompt = this.buildSystemPrompt(agentConfig, contextText, retrievalResults);
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: request.text
        }
      ];

      // TODO: Add tool execution logic here (Phase 5)

      // Call LLM
      const modelRef: ModelRef = {
        provider: 'google',
        name: agentConfig.model.name
      };

      let fullResponse = '';
      let messageId: string | undefined;
      let messageText: string | undefined;
      let hasError = false;

      // Wrap the LLM stream call in a Promise to wait for completion
      await new Promise<void>((resolve, reject) => {
        callLLMStream(modelRef, messages, {
          onToken: (token: string) => {
            // TODO: Stream token to client via SSE
            fullResponse += token;
          },
          onDone: async (finalResponse: string) => {
            try {
              // Check if we got a response
              if (!finalResponse || finalResponse.trim() === '') {
                logger.error({ agentKey: request.agentKey }, 'LLM returned empty response');
                finalResponse = "I apologize, but I'm having trouble generating a response right now. This might be due to an API configuration issue. Please contact support if this persists.";
              }
              
              // Apply output gate checks
              const gateResult = await outputGateService.checkResponse(
                request.agentKey,
                request.text,
                finalResponse,
                retrievalResults
              );

              let finalText = finalResponse;
              let citations: any[] = [];

              if (!gateResult.allowed) {
                // Generate refusal message
                finalText = outputGateService.generateRefusalMessage(request.agentKey, request.text);
                logger.info({ 
                  agentKey: request.agentKey,
                  reason: gateResult.reason 
                }, 'Response blocked by output gate');
              } else if (gateResult.modifiedResponse) {
                // Use modified response with disclaimers
                finalText = gateResult.modifiedResponse;
                logger.info({ agentKey: request.agentKey }, 'Response modified with disclaimers');
              }

              // Build citations from retrieval results
              if (retrievalResults.length > 0) {
                citations = retrievalResults.map(result => ({
                  sourceId: result.sourceId,
                  title: result.title,
                  url: result.url
                }));
              }

              // Save assistant message to database
              const Message = (await import('../db/models')).Message;
              const message = new Message({
                conversationId: request.conversationId,
                role: 'assistant',
                text: finalText,
                citations
              });
              await message.save();
              messageId = message._id.toString();
              messageText = finalText;
              
              logger.info({ 
                messageId, 
                conversationId: request.conversationId,
                hasCitations: citations.length > 0,
                gateResult: gateResult.allowed ? 'allowed' : 'blocked'
              }, 'Assistant message saved');
              
              resolve();
            } catch (error) {
              logger.error({ error }, 'Failed to save assistant message');
              reject(error);
            }
          },
          onError: (error: Error) => {
            logger.error({ error, agentKey: request.agentKey }, 'LLM stream error');
            hasError = true;
            // Generate error message for the user
            fullResponse = "I apologize, but I'm unable to generate a response at the moment. This appears to be an API connectivity issue. Please ensure your Google Gemini API key is valid and properly configured.";
            reject(error);
          }
        }).catch(reject);
      });

      // If there was an error and we have a fallback message, save it
      if (hasError && fullResponse) {
        const Message = (await import('../db/models')).Message;
        const message = new Message({
          conversationId: request.conversationId,
          role: 'assistant',
          text: fullResponse,
        });
        await message.save();
        messageId = message._id.toString();
        messageText = fullResponse;
      }

      return {
        success: true,
        messageId,
        message: messageText,
      };

    } catch (error) {
      logger.error({ error, request }, 'Chat orchestration failed');
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Build context text from retrieval results
   */
  private buildContextFromRetrieval(results: RetrievalResult[]): string {
    if (results.length === 0) return '';

    const contextParts = results.map((result, index) => {
      let context = `[Source ${index + 1}]`;
      if (result.title) {
        context += ` ${result.title}`;
      }
      context += `\n${result.chunk}`;
      if (result.url) {
        context += `\nURL: ${result.url}`;
      }
      return context;
    });

    return `\n\nRelevant Context:\n${contextParts.join('\n\n')}\n\n`;
  }

  /**
   * Build system prompt with context and instructions
   */
  private buildSystemPrompt(
    agentConfig: any, 
    contextText: string, 
    retrievalResults: RetrievalResult[]
  ): string {
    let systemPrompt = agentConfig.systemPrompt;

    // Add context if available
    if (contextText) {
      systemPrompt += contextText;
    }

    // Add citation instructions if we have retrieval results
    if (retrievalResults.length > 0) {
      systemPrompt += `\n\nWhen referencing information from the provided context, please cite the source using [Source X] format where X is the source number.`;
    }

    // Add domain-specific instructions
    if (agentConfig.guardrails.medicalDisclaimer) {
      systemPrompt += `\n\nIMPORTANT: Always include appropriate medical disclaimers and never provide specific medical advice or diagnosis.`;
    }

    if (agentConfig.guardrails.financialDisclaimer) {
      systemPrompt += `\n\nIMPORTANT: Always include appropriate financial disclaimers and never provide personal financial advice.`;
    }

    return systemPrompt;
  }
}

export const chatOrchestrator = new ChatOrchestrator();
