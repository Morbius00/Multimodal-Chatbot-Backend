import { Router } from 'express';
import { z } from 'zod';
import { Message, Conversation } from '../db/models';
import { authMiddleware, AuthenticatedRequest } from '../auth/jwt';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const GetMessagesQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  cursor: z.string().optional(),
});

const FeedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
  note: z.string().optional(),
});

// GET /messages - Get messages across all conversations (for admin/debugging)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit, cursor } = GetMessagesQuerySchema.parse(req.query);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Only get messages from user's conversations
    const userConversations = await Conversation.find({ userId: req.user.sub }).select('_id');
    const conversationIds = userConversations.map(conv => conv._id);
    
    const query: any = { conversationId: { $in: conversationIds } };
    
    if (cursor) {
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
      messages: messages.reverse(),
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch messages');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /messages/:id - Get specific message
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const message = await Message.findById(id)
      .populate('attachments', 'uri mime kind size')
      .lean();
    
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    
    // Verify message belongs to user's conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      userId: req.user.sub,
    });
    
    if (!conversation) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    
    res.json(message);
  } catch (error) {
    logger.error({ error, messageId: req.params.id }, 'Failed to fetch message');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /messages/:id/feedback - Submit feedback for a message
router.post('/:id/feedback', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { rating, note } = FeedbackSchema.parse(req.body);
    
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const message = await Message.findById(id);
    
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    
    // Verify message belongs to user's conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      userId: req.user.sub,
    });
    
    if (!conversation) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    
    // Add feedback to message metadata
    if (!message.metadata) {
      message.metadata = {};
    }
    
    message.metadata.feedback = {
      rating,
      note,
      submittedAt: new Date(),
      userId: req.user.sub,
    };
    
    await message.save();
    
    logger.info({ 
      messageId: id, 
      rating, 
      userId: req.user.sub 
    }, 'Message feedback submitted');
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }
    
    logger.error({ error, messageId: req.params.id }, 'Failed to submit feedback');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
