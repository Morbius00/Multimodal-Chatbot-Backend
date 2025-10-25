import { Router } from 'express';
import { z } from 'zod';
import { Agent } from '../db/models';
import { authMiddleware, AuthenticatedRequest } from '../auth/jwt';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const GetAgentsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
});

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: Get list of available agents
 *     description: Retrieve a paginated list of all available agents
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of agents to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of agents to skip
 *     responses:
 *       200:
 *         description: List of agents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
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
// GET /agents - List all available agents
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit, offset } = GetAgentsQuerySchema.parse(req.query);
    
    const agents = await Agent.find()
      .select('-systemPrompt') // Don't expose system prompts in public API
      .limit(limit)
      .skip(offset)
      .sort({ key: 1 });
    
    const total = await Agent.countDocuments();
    
    res.json({
      agents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch agents');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/agents/{key}:
 *   get:
 *     summary: Get specific agent details
 *     description: Retrieve details for a specific agent by key
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent key identifier
 *         example: general
 *     responses:
 *       200:
 *         description: Agent details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Agent not found
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
// GET /agents/:key - Get specific agent details
router.get('/:key', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.params;
    
    const agent = await Agent.findOne({ key }).select('-systemPrompt');
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    res.json(agent);
  } catch (error) {
    logger.error({ error, key: req.params.key }, 'Failed to fetch agent');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
