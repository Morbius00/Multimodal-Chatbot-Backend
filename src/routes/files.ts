import { Router } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../auth/jwt';
import { FileDoc } from '../db/models';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/files/:id - return file metadata and transcripts
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const file = await FileDoc.findById(id).lean();
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Only allow owner or admins (simple check: ownerId match)
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (String(file.ownerId) !== req.user.sub) {
      // For now, disallow if not owner. Adjust if admin role support needed.
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ success: true, file });
  } catch (error) {
    logger.error({ error, params: req.params }, 'Failed to fetch file');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
