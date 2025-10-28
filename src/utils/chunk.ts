import { logger } from '../utils/logger';

export interface ChunkOptions {
  maxChunkSize: number;
  overlap: number;
  minChunkSize: number;
  preserveSentences: boolean;
  preserveParagraphs: boolean;
}

export interface DocumentChunk {
  text: string;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    startPosition: number;
    endPosition: number;
    source?: string;
    title?: string;
  };
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxChunkSize: 1000,
  overlap: 100,
  minChunkSize: 50,
  preserveSentences: true,
  preserveParagraphs: true
};

export class DocumentChunker {
  /**
   * Chunk a document into smaller pieces for embedding
   */
  chunkDocument(
    text: string, 
    options: Partial<ChunkOptions> = {}
  ): DocumentChunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
      logger.info({ 
        textLength: text.length,
        options: opts 
      }, 'Starting document chunking');

      // Clean and normalize text
      const cleanedText = this.cleanText(text);
      
      if (cleanedText.length <= opts.maxChunkSize) {
        return [{
          text: cleanedText,
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startPosition: 0,
            endPosition: cleanedText.length
          }
        }];
      }

      // Split into chunks based on options
      let chunks: DocumentChunk[] = [];
      
      if (opts.preserveParagraphs) {
        chunks = this.chunkByParagraphs(cleanedText, opts);
      } else if (opts.preserveSentences) {
        chunks = this.chunkBySentences(cleanedText, opts);
      } else {
        chunks = this.chunkByFixedSize(cleanedText, opts);
      }

      // Filter out chunks that are too small
      const validChunks = chunks.filter(chunk => 
        chunk.text.length >= opts.minChunkSize
      );

      logger.info({ 
        originalChunks: chunks.length,
        validChunks: validChunks.length,
        avgChunkSize: validChunks.reduce((sum, c) => sum + c.text.length, 0) / validChunks.length
      }, 'Document chunking completed');

      return validChunks;

    } catch (error) {
      logger.error({ error, textLength: text.length }, 'Document chunking failed');
      throw error;
    }
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Chunk by paragraphs
   */
  private chunkByParagraphs(text: string, options: ChunkOptions): DocumentChunk[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let startPosition = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = (paragraphs[i] || '').trim();
      
      if (!paragraph) continue;

      // If adding this paragraph would exceed max size, start a new chunk
      if (currentChunk && (currentChunk.length + paragraph.length + 1) > options.maxChunkSize) {
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              chunkIndex: chunkIndex++,
              totalChunks: 0, // Will be updated later
              startPosition,
              endPosition: startPosition + currentChunk.length
            }
          });
        }
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, options.overlap);
        currentChunk = overlapText + (overlapText ? '\n' : '') + paragraph;
        startPosition += currentChunk.length - paragraph.length - (overlapText ? overlapText.length + 1 : 0);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          chunkIndex: chunkIndex++,
          totalChunks: 0,
          startPosition,
          endPosition: startPosition + currentChunk.length
        }
      });
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Chunk by sentences
   */
  private chunkBySentences(text: string, options: ChunkOptions): DocumentChunk[] {
    // Simple sentence splitting (can be improved with NLP libraries)
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let startPosition = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = (sentences[i] || '').trim();
      
      if (!sentence) continue;

      // If adding this sentence would exceed max size, start a new chunk
      if (currentChunk && (currentChunk.length + sentence.length + 1) > options.maxChunkSize) {
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              chunkIndex: chunkIndex++,
              totalChunks: 0,
              startPosition,
              endPosition: startPosition + currentChunk.length
            }
          });
        }
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, options.overlap);
        currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
        startPosition += currentChunk.length - sentence.length - (overlapText ? overlapText.length + 1 : 0);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length >= options.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          chunkIndex: chunkIndex++,
          totalChunks: 0,
          startPosition,
          endPosition: startPosition + currentChunk.length
        }
      });
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Chunk by fixed size
   */
  private chunkByFixedSize(text: string, options: ChunkOptions): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const chunkSize = options.maxChunkSize;
    const overlap = options.overlap;
    
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const endIndex = Math.min(i + chunkSize, text.length);
      const chunkText = text.slice(i, endIndex);
      
      if (chunkText.length >= options.minChunkSize) {
        chunks.push({
          text: chunkText,
          metadata: {
            chunkIndex: chunks.length,
            totalChunks: 0,
            startPosition: i,
            endPosition: endIndex
          }
        });
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Get overlap text from the end of current chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (overlapSize <= 0) return '';
    
    const words = text.split(' ');
    if (words.length === 0) return '';
    
    let overlapText = '';
    let wordCount = 0;
    
    // Start from the end and work backwards
    for (let i = words.length - 1; i >= 0 && wordCount < overlapSize; i--) {
      const word = words[i] || '';
      if (overlapText.length + word.length + 1 <= overlapSize) {
        overlapText = word + (overlapText ? ' ' + overlapText : '');
        wordCount++;
      } else {
        break;
      }
    }
    
    return overlapText;
  }

  /**
   * Chunk PDF content (after OCR)
   */
  chunkPDFContent(
    pdfText: string,
    metadata: { title?: string; url?: string; pageNumbers?: number[] },
    options: Partial<ChunkOptions> = {}
  ): DocumentChunk[] {
    const chunks = this.chunkDocument(pdfText, options);
    
    // Add PDF-specific metadata
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        source: 'pdf',
        title: metadata.title,
        url: metadata.url,
        pageNumbers: metadata.pageNumbers
      }
    }));
  }

  /**
   * Chunk markdown content
   */
  chunkMarkdownContent(
    markdown: string,
    metadata: { title?: string; url?: string },
    options: Partial<ChunkOptions> = {}
  ): DocumentChunk[] {
    // Remove markdown syntax for better chunking
    const cleanText = markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links, keep text

    const chunks = this.chunkDocument(cleanText, options);
    
    // Add markdown-specific metadata
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        source: 'markdown',
        title: metadata.title,
        url: metadata.url
      }
    }));
  }
}

export const documentChunker = new DocumentChunker();
