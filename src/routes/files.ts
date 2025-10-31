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

// DELETE /api/files/:id - delete file from cloud and database
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const file = await FileDoc.findById(id);
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Only allow owner to delete
    if (String(file.ownerId) !== req.user.sub) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Delete from cloud storage if cloudPublicId exists
    if (file.cloudPublicId) {
      try {
        const { storageService } = await import('../services/storage');
        const resourceType = file.kind === 'image' ? 'image' : 'raw';
        await storageService.deleteFromCloud(file.cloudPublicId, resourceType);
        logger.info({ fileId: id, publicId: file.cloudPublicId }, 'File deleted from cloud storage');
      } catch (cloudErr) {
        logger.error({ error: cloudErr, fileId: id }, 'Failed to delete file from cloud storage');
        // Continue with DB deletion even if cloud deletion fails
      }
    }

    // Delete from database
    await FileDoc.findByIdAndDelete(id);
    
    logger.info({ fileId: id, userId: req.user.sub }, 'File deleted successfully');
    res.status(204).send();
  } catch (error) {
    logger.error({ error, params: req.params }, 'Failed to delete file');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
