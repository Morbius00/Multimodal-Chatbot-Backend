import { Router } from 'express';
import { z } from 'zod';
import { Conversation, Message } from '../db/models';
import { authMiddleware, AuthenticatedRequest } from '../auth/jwt';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const CreateConversationSchema = z.object({
  agentKey: z.string().min(1),
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const GetConversationsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  agentKey: z.string().optional(),
});

const GetMessagesQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  cursor: z.string().optional(),
});

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
 *     description: Create a new conversation with a specific agent
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentKey
 *             properties:
 *               agentKey:
 *                 type: string
 *                 description: Agent key for this conversation
 *                 example: general
 *               title:
 *                 type: string
 *                 description: Conversation title
 *                 example: My Chat Session
 *               metadata:
 *                 type: object
 *                 description: Additional conversation metadata
 *                 additionalProperties: true
 *                 example:
 *                   source: web
 *                   priority: normal
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Created conversation ID
 *                 agentKey:
 *                   type: string
 *                   description: Agent key
 *                 title:
 *                   type: string
 *                   description: Conversation title
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Creation timestamp
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /conversations - Create a new conversation
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { agentKey, title, metadata } = CreateConversationSchema.parse(req.body);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const conversation = new Conversation({
      userId: req.user.sub,
      agentKey,
      title,
      metadata,
    });
    
    await conversation.save();
    
    logger.info({ 
      conversationId: conversation._id, 
      userId: req.user.sub, 
      agentKey 
    }, 'Conversation created');
    
    res.status(201).json({
      id: conversation._id,
      agentKey: conversation.agentKey,
      title: conversation.title,
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    
    logger.error({ error }, 'Failed to create conversation');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /conversations - List user's conversations
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit, offset, agentKey } = GetConversationsQuerySchema.parse(req.query);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const filter: any = { userId: req.user.sub };
    if (agentKey) {
      filter.agentKey = agentKey;
    }
    
    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
    
    const total = await Conversation.countDocuments(filter);
    
    res.json({
      conversations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch conversations');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /conversations/:id - Get specific conversation
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user.sub,
    });
    
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    res.json(conversation);
  } catch (error) {
    logger.error({ error, conversationId: req.params.id }, 'Failed to fetch conversation');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /conversations/:id/messages - Get conversation messages
router.get('/:id/messages', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { limit, cursor } = GetMessagesQuerySchema.parse(req.query);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user.sub,
    });
    
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    const query: any = { conversationId: id };
    
    if (cursor) {
      // For cursor-based pagination, find messages after the cursor
      const cursorMessage = await Message.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('attachments', 'uri mime kind size')
      .lean();
    
    const hasMore = messages.length === limit;
    const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1]?._id : null;
    
    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    logger.error({ error, conversationId: req.params.id }, 'Failed to fetch messages');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /conversations/:id - Delete conversation
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const conversation = await Conversation.findOneAndDelete({
      _id: id,
      userId: req.user.sub,
    });
    
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    // Also delete all messages in this conversation
    await Message.deleteMany({ conversationId: id });
    
    logger.info({ 
      conversationId: id, 
      userId: req.user.sub 
    }, 'Conversation deleted');
    
    res.status(204).send();
  } catch (error) {
    logger.error({ error, conversationId: req.params.id }, 'Failed to delete conversation');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
