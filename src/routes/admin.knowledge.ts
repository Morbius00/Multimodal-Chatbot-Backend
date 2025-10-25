import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../auth/jwt';
import { retrievalService } from '../services/retrieval';
import { documentChunker } from '../utils/chunk';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication and admin role requirement to all routes
router.use(authMiddleware);
router.use(requireRole('admin'));

// Validation schemas
const ImportKnowledgeSchema = z.object({
  collection: z.string().min(1),
  documents: z.array(z.object({
    docId: z.string().min(1),
    title: z.string().optional(),
    url: z.string().optional(),
    content: z.string().min(1),
    metadata: z.record(z.any()).optional(),
  })).min(1),
  chunkOptions: z.object({
    maxChunkSize: z.number().default(1000),
    overlap: z.number().default(100),
    minChunkSize: z.number().default(50),
    preserveSentences: z.boolean().default(true),
    preserveParagraphs: z.boolean().default(true),
  }).optional(),
});

const SearchKnowledgeSchema = z.object({
  query: z.string().min(1),
  collections: z.array(z.string()).optional(),
  topK: z.number().default(10),
  minScore: z.number().default(0.5),
});

// POST /admin/knowledge/import - Import knowledge documents
router.post('/import', async (req: AuthenticatedRequest, res) => {
  try {
    const { collection, documents, chunkOptions } = ImportKnowledgeSchema.parse(req.body);
    
    logger.info({ 
      collection, 
      documentCount: documents.length,
      userId: req.user?.sub 
    }, 'Starting knowledge import');

    const results = {
      collection,
      totalDocuments: documents.length,
      totalChunks: 0,
      errors: [] as string[],
      success: true
    };

    // Process each document
    for (const doc of documents) {
      try {
        // Chunk the document
        const chunks = documentChunker.chunkDocument(doc.content, chunkOptions);
        
        // Prepare chunks for batch insertion
        const chunkData = chunks.map(chunk => ({
          collection,
          docId: doc.docId,
          title: doc.title,
          url: doc.url,
          chunk: chunk.text,
          metadata: {
            ...doc.metadata,
            ...chunk.metadata
          }
        }));

        // Add chunks to retrieval service
        const chunkIds = await retrievalService.addChunks(chunkData);
        results.totalChunks += chunkIds.length;

        logger.info({ 
          docId: doc.docId,
          chunksCreated: chunkIds.length 
        }, 'Document processed successfully');

      } catch (error) {
        const errorMsg = `Failed to process document ${doc.docId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        logger.error({ error, docId: doc.docId }, 'Document processing failed');
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
      logger.warn({ 
        errorCount: results.errors.length,
        totalDocuments: results.totalDocuments 
      }, 'Knowledge import completed with errors');
    } else {
      logger.info({ 
        totalChunks: results.totalChunks,
        totalDocuments: results.totalDocuments 
      }, 'Knowledge import completed successfully');
    }

    res.json(results);

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
      return;
    }

    logger.error({ error }, 'Knowledge import failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/knowledge/search - Search knowledge base
router.post('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { query, collections, topK, minScore } = SearchKnowledgeSchema.parse(req.body);
    
    logger.info({ 
      query: query.substring(0, 100) + '...',
      collections,
      topK,
      userId: req.user?.sub 
    }, 'Knowledge search requested');

    const results = await retrievalService.search(query, {
      collections: collections || ['global_faq'], // Default to global FAQ if no collections specified
      topK,
      minScore
    });

    res.json({
      query,
      results,
      totalResults: results.length
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
      return;
    }

    logger.error({ error }, 'Knowledge search failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/knowledge/collections - List available collections
router.get('/collections', async (req: AuthenticatedRequest, res) => {
  try {
    // Get collections from agent configurations
    const { getAllAgentConfigs } = await import('../agents/config');
    const agentConfigs = getAllAgentConfigs();
    
    const collections = new Set<string>();
    agentConfigs.forEach(agent => {
      agent.retrieval.collections.forEach(collection => {
        collections.add(collection);
      });
    });

    // Get stats for each collection
    const collectionStats = await Promise.all(
      Array.from(collections).map(async (collection) => {
        try {
          const stats = await retrievalService.getCollectionStats(collection);
          return {
            name: collection,
            ...stats
          };
        } catch (error) {
          logger.error({ error, collection }, 'Failed to get collection stats');
          return {
            name: collection,
            totalChunks: 0,
            totalDocuments: 0,
            avgChunkLength: 0
          };
        }
      })
    );

    res.json({
      collections: collectionStats,
      totalCollections: collectionStats.length
    });

  } catch (error) {
    logger.error({ error }, 'Failed to list collections');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/knowledge/collections/:collection - Delete all chunks in a collection
router.delete('/collections/:collection', async (req: AuthenticatedRequest, res) => {
  try {
    const { collection } = req.params;
    
    logger.info({ 
      collection,
      userId: req.user?.sub 
    }, 'Collection deletion requested');

    // This would require implementing a delete method in retrieval service
    // For now, return a not implemented response
    res.status(501).json({ 
      error: 'Collection deletion not yet implemented',
      message: 'This feature will be available in a future update'
    });

  } catch (error) {
    logger.error({ error, collection: req.params.collection }, 'Collection deletion failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/knowledge/stats - Get overall knowledge base statistics
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const { getAllAgentConfigs } = await import('../agents/config');
    const agentConfigs = getAllAgentConfigs();
    
    const collections = new Set<string>();
    agentConfigs.forEach(agent => {
      agent.retrieval.collections.forEach(collection => {
        collections.add(collection);
      });
    });

    const totalStats = {
      totalCollections: collections.size,
      totalChunks: 0,
      totalDocuments: 0,
      avgChunkLength: 0
    };

    // Get stats for all collections
    for (const collection of collections) {
      try {
        const stats = await retrievalService.getCollectionStats(collection);
        totalStats.totalChunks += stats.totalChunks;
        totalStats.totalDocuments += stats.totalDocuments;
        totalStats.avgChunkLength += stats.avgChunkLength;
      } catch (error) {
        logger.error({ error, collection }, 'Failed to get collection stats');
      }
    }

    if (collections.size > 0) {
      totalStats.avgChunkLength = totalStats.avgChunkLength / collections.size;
    }

    res.json(totalStats);

  } catch (error) {
    logger.error({ error }, 'Failed to get knowledge base stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
