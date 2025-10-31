import { Router } from 'express';
import { z } from 'zod';
import { Conversation, Message } from '../db/models';
import { generateConversationTitle, shouldUpdateConversationTitle } from '../utils/conversation';
import { getAgentConfig } from '../agents/config';
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

const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  metadata: z.record(z.any()).optional(),
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
    
    // Only set title if explicitly provided, otherwise leave undefined
    // The title will be auto-generated from the first user message
    const conversationData: any = {
      userId: req.user.sub,
      agentKey,
      metadata,
    };
    
    // Only include title if it was explicitly provided
    if (title) {
      conversationData.title = title;
    }
    
    const conversation = new Conversation(conversationData);
    
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

    // For conversations that still use the agent display name (or other default),
    // try to generate a better title from the first user message.
    // This fixes the UI showing the agent name as the conversation title.
    try {
      // Process each conversation sequentially (limit is small; default 20)
      for (const conv of conversations) {
        const agentConfig = getAgentConfig(conv.agentKey);
        const agentDisplayName = agentConfig?.displayName || '';

        if (shouldUpdateConversationTitle(conv.title || undefined, agentDisplayName)) {
          // Find first user message in this conversation
          const firstUserMessage = await Message.findOne({ conversationId: conv._id, role: 'user' })
            .sort({ createdAt: 1 })
            .lean();

          if (firstUserMessage && firstUserMessage.text) {
            const newTitle = generateConversationTitle(firstUserMessage.text);

            // Persist the new title so subsequent reads won't repeat this work
            await Conversation.updateOne({ _id: conv._id }, { $set: { title: newTitle } });

            // Update the response object
            conv.title = newTitle;
          }
        }
      }
    } catch (err) {
      // Don't fail the whole request if title generation fails for some conversations
      logger.error({ error: err }, 'Failed to auto-generate conversation titles');
    }
    
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
      .populate('attachments', 'uri mime kind size cloudPublicId')
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

/**
 * @swagger
 * /api/conversations/{id}:
 *   patch:
 *     summary: Update conversation details
 *     description: Update conversation title or metadata
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New conversation title
 *                 example: Discussion about Machine Learning
 *               metadata:
 *                 type: object
 *                 description: Additional conversation metadata
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
// PATCH /conversations/:id - Update conversation
router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, metadata } = UpdateConversationSchema.parse(req.body);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (metadata !== undefined) updateData.metadata = metadata;
    
    const conversation = await Conversation.findOneAndUpdate(
      { _id: id, userId: req.user.sub },
      { $set: updateData },
      { new: true }
    );
    
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    logger.info({ 
      conversationId: id, 
      userId: req.user.sub,
      updates: Object.keys(updateData)
    }, 'Conversation updated');
    
    res.json({
      id: conversation._id,
      title: conversation.title,
      metadata: conversation.metadata,
      updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    
    logger.error({ error, conversationId: req.params.id }, 'Failed to update conversation');
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
