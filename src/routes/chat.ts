import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Message, Conversation } from '../db/models';
import { authMiddleware, AuthenticatedRequest } from '../auth/jwt';
import { chatOrchestrator } from '../services/orchestrator';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const ChatRequestSchema = z.object({
  conversationId: z.string().min(1),
  agentKey: z.string().optional(),
  text: z.string().min(1),
  attachmentIds: z.array(z.string()).optional(),
});

// SSE helper functions
function sseInit(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });
}

function sseSend(res: Response, type: string, data: any): void {
  const event = `data: ${JSON.stringify({ type, data })}\n\n`;
  res.write(event);
}

function sseRefusal(res: Response, message: string): void {
  sseSend(res, 'error', { message });
  res.end();
}

// POST /chat/stream - Stream chat response via SSE
router.post('/stream', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, agentKey, text, attachmentIds } = ChatRequestSchema.parse(req.body);
    
    if (!req.user) {
      sseRefusal(res, 'User not authenticated');
      return;
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.sub,
    });

    if (!conversation) {
      sseRefusal(res, 'Conversation not found');
      return;
    }

    // Use provided agentKey or conversation's agentKey
    const finalAgentKey = agentKey || conversation.agentKey;

    // Save user message first
    const userMessageData: any = {
      conversationId,
      role: 'user',
      text,
    };
    
    // Only include attachments if provided and not empty
    if (attachmentIds && attachmentIds.length > 0) {
      userMessageData.attachments = attachmentIds;
    }
    
    const userMessage = new Message(userMessageData);
    await userMessage.save();

    logger.info({ 
      messageId: userMessage._id,
      conversationId,
      agentKey: finalAgentKey,
      userId: req.user.sub 
    }, 'User message saved');

    // Initialize SSE
    sseInit(res);

    // Process chat request
    const result = await chatOrchestrator.processChatRequest({
      conversationId,
      agentKey: finalAgentKey,
      text,
      attachmentIds,
      userId: req.user.sub,
    });

    if (!result.success) {
      sseRefusal(res, result.error || 'Chat processing failed');
      return;
    }

    // Send final response
    sseSend(res, 'final', { 
      messageId: result.messageId,
      success: true 
    });
    
    res.end();

  } catch (error) {
    if (error instanceof z.ZodError) {
      sseRefusal(res, 'Invalid request data');
      return;
    }

    logger.error({ error }, 'Chat stream error');
    sseRefusal(res, 'Internal server error');
  }
});

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a chat message (non-streaming)
 *     description: Send a chat message and get a response without streaming
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - text
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Conversation ID
 *                 example: 507f1f77bcf86cd799439011
 *               agentKey:
 *                 type: string
 *                 description: Agent key (optional, uses conversation's agent if not provided)
 *                 example: general
 *               text:
 *                 type: string
 *                 description: Message text
 *                 example: Hello, how are you?
 *               attachmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of attachment IDs
 *                 example: [file_id_1, file_id_2]
 *     responses:
 *       200:
 *         description: Chat message processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messageId:
 *                   type: string
 *                   description: ID of the assistant's response message
 *                   example: 507f1f77bcf86cd799439012
 *                 message:
 *                   type: string
 *                   description: The assistant's response text
 *                   example: Hello! I'm doing great, thank you for asking. How can I assist you today?
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /chat - Non-streaming chat endpoint (for testing)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, agentKey, text, attachmentIds } = ChatRequestSchema.parse(req.body);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.sub,
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const finalAgentKey = agentKey || conversation.agentKey;

    // Save user message
    const userMessageData: any = {
      conversationId,
      role: 'user',
      text,
    };
    
    // Only include attachments if provided and not empty
    if (attachmentIds && attachmentIds.length > 0) {
      userMessageData.attachments = attachmentIds;
    }
    
    const userMessage = new Message(userMessageData);
    await userMessage.save();

    // Process chat request
    const result = await chatOrchestrator.processChatRequest({
      conversationId,
      agentKey: finalAgentKey,
      text,
      attachmentIds,
      userId: req.user.sub,
    });

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      messageId: result.messageId,
      message: result.message,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }

    logger.error({ error }, 'Chat error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
