import { KnowledgeChunk } from '../db/models';
import { generateEmbedding } from './llm.google';
import { logger } from '../utils/logger';

export interface RetrievalResult {
  chunk: string;
  sourceId: string;
  title?: string;
  url?: string;
  score?: number;
  metadata?: any;
}

export interface RetrievalConfig {
  collections: string[];
  topK: number;
  minScore?: number;
}

export class RetrievalService {
  /**
   * Search for relevant knowledge chunks using vector similarity
   */
  async search(
    query: string, 
    config: RetrievalConfig
  ): Promise<RetrievalResult[]> {
    try {
      logger.info({ 
        query: query.substring(0, 100) + '...', 
        config 
      }, 'Starting retrieval search');

      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      
      // Perform vector search using MongoDB aggregation pipeline
      // NOTE: $vectorSearch MUST be the first stage in the pipeline
      const pipeline = [
        // Vector search stage (Atlas Vector Search) - MUST be first
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: Math.max(200, config.topK * 10), // Get more candidates for filtering
            limit: config.topK * 5, // Get more results to filter by collection
            filter: {
              collection: { $in: config.collections }
            }
          }
        },
        // Add similarity score
        {
          $addFields: {
            score: { $meta: 'vectorSearchScore' }
          }
        },
        // Filter by collection (in case filter in $vectorSearch doesn't work)
        {
          $match: {
            collection: { $in: config.collections }
          }
        },
        // Filter by minimum score if specified
        ...(config.minScore ? [{
          $match: {
            score: { $gte: config.minScore }
          }
        }] : []),
        // Limit to topK results after filtering
        {
          $limit: config.topK
        },
        // Project only needed fields
        {
          $project: {
            chunk: 1,
            collection: 1,
            docId: 1,
            title: 1,
            url: 1,
            score: 1,
            metadata: 1
          }
        }
      ];

      const results = await KnowledgeChunk.aggregate(pipeline);
      
      logger.info({ 
        resultsCount: results.length,
        collections: config.collections 
      }, 'Retrieval search completed');

      return results.map(result => ({
        chunk: result.chunk,
        sourceId: result.docId,
        title: result.title,
        url: result.url,
        score: result.score,
        metadata: result.metadata
      }));

    } catch (error) {
      logger.error({ error, query, config }, 'Retrieval search failed');
      throw error;
    }
  }

  /**
   * Add a knowledge chunk to the vector database
   */
  async addChunk(
    collection: string,
    docId: string,
    chunk: string,
    title?: string,
    url?: string,
    metadata?: any
  ): Promise<string> {
    try {
      // Generate embedding for the chunk
      const embedding = await generateEmbedding(chunk);
      
      // Create knowledge chunk document
      const knowledgeChunk = new KnowledgeChunk({
        collection,
        docId,
        title,
        url,
        chunk,
        embedding,
        metadata
      });

      await knowledgeChunk.save();
      
      logger.info({ 
        chunkId: knowledgeChunk._id,
        collection,
        docId,
        chunkLength: chunk.length 
      }, 'Knowledge chunk added');

      return knowledgeChunk._id.toString();

    } catch (error) {
      logger.error({ error, collection, docId }, 'Failed to add knowledge chunk');
      throw error;
    }
  }

  /**
   * Add multiple chunks in batch
   */
  async addChunks(
    chunks: Array<{
      collection: string;
      docId: string;
      chunk: string;
      title?: string;
      url?: string;
      metadata?: any;
    }>
  ): Promise<string[]> {
    try {
      logger.info({ count: chunks.length }, 'Adding knowledge chunks in batch');

      const chunkIds: string[] = [];
      
      // Process chunks in batches to avoid overwhelming the embedding API
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const promises = batch.map(async (chunkData) => {
          const embedding = await generateEmbedding(chunkData.chunk);
          return {
            collection: chunkData.collection,
            docId: chunkData.docId,
            title: chunkData.title,
            url: chunkData.url,
            chunk: chunkData.chunk,
            embedding,
            metadata: chunkData.metadata
          };
        });

        const processedChunks = await Promise.all(promises);
        const savedChunks = await KnowledgeChunk.insertMany(processedChunks);
        
        chunkIds.push(...savedChunks.map(chunk => chunk._id.toString()));
        
        logger.info({ 
          batch: Math.floor(i / batchSize) + 1,
          processed: Math.min(i + batchSize, chunks.length),
          total: chunks.length 
        }, 'Batch processed');
      }

      logger.info({ totalAdded: chunkIds.length }, 'All knowledge chunks added');
      return chunkIds;

    } catch (error) {
      logger.error({ error, chunkCount: chunks.length }, 'Failed to add knowledge chunks');
      throw error;
    }
  }

  /**
   * Delete chunks by document ID
   */
  async deleteChunksByDocId(docId: string): Promise<number> {
    try {
      const result = await KnowledgeChunk.deleteMany({ docId });
      
      logger.info({ 
        docId, 
        deletedCount: result.deletedCount 
      }, 'Chunks deleted by document ID');

      return result.deletedCount || 0;

    } catch (error) {
      logger.error({ error, docId }, 'Failed to delete chunks by document ID');
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collection: string): Promise<{
    totalChunks: number;
    totalDocuments: number;
    avgChunkLength: number;
  }> {
    try {
      const stats = await KnowledgeChunk.aggregate([
        { $match: { collection } },
        {
          $group: {
            _id: null,
            totalChunks: { $sum: 1 },
            totalDocuments: { $addToSet: '$docId' },
            avgChunkLength: { $avg: { $strLenCP: '$chunk' } }
          }
        },
        {
          $project: {
            totalChunks: 1,
            totalDocuments: { $size: '$totalDocuments' },
            avgChunkLength: { $round: ['$avgChunkLength', 2] }
          }
        }
      ]);

      return stats[0] || { totalChunks: 0, totalDocuments: 0, avgChunkLength: 0 };

    } catch (error) {
      logger.error({ error, collection }, 'Failed to get collection stats');
      throw error;
    }
  }
}

export const retrievalService = new RetrievalService();
