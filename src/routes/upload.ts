import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../auth/jwt';
import { FileDoc } from '../db/models';
import { logger } from '../utils/logger';
import { retrievalService } from '../services/retrieval';
import { storageService } from '../services/storage';

// Configure multer with file size limits
const upload = multer({ 
  dest: 'uploads/temp/', // Temporary local storage before cloud upload
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1, // Only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // Optional: Add allowed file types validation
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'application/pdf',
      'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

const router = Router();

const UploadFieldsSchema = z.object({
  conversationId: z.string().optional(),
  collection: z.string().optional(),
});

function inferKind(mime: string) {
  if (mime.includes('pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  return 'other';
}

async function extractTextFromFile(filePath: string, kind: string): Promise<string> {
  if (kind === 'pdf') {
    const data = await fs.readFile(filePath);
    const parsed = await pdfParse(data);
    return parsed.text || '';
  }

  if (kind === 'image') {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    return text || '';
  }

  // TODO: support audio transcription
  return '';
}

function chunkText(text: string, chunkSize = 1000) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

// POST /upload - upload a file and process it
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ 
          error: 'File too large',
          message: 'Maximum file size is 50MB',
          code: 'FILE_TOO_LARGE'
        });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ 
          error: 'Too many files',
          message: 'Only one file can be uploaded at a time',
          code: 'TOO_MANY_FILES'
        });
        return;
      }
      res.status(400).json({ 
        error: 'Upload error', 
        message: err.message,
        code: err.code
      });
      return;
    } else if (err) {
      res.status(400).json({ 
        error: 'Upload failed',
        message: err.message
      });
      return;
    }
    next();
  });
}, async (req: AuthenticatedRequest, res) => {
  try {
    const body = UploadFieldsSchema.parse(req.body || {});

    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const kind = inferKind(file.mimetype || '');
    
    // Keep temp file path for text extraction
    const tempPath = file.path;

    // Extract text (pdf/image) from temp file
    let text = '';
    try {
      text = await extractTextFromFile(tempPath, kind);
    } catch (err) {
      logger.error({ err, file: tempPath }, 'Failed to extract text from file');
    }

    // Upload to cloud storage (Cloudinary)
    let cloudUrl = '';
    let cloudPublicId = '';
    try {
      const uploadResult = await storageService.uploadToCloud(tempPath, {
        folder: `users/${req.user.sub}/files`,
        resourceType: kind === 'image' ? 'image' : 'raw',
        tags: [req.user.sub, kind, body.conversationId || 'general'].filter(Boolean),
      });
      
      cloudUrl = uploadResult.secureUrl;
      cloudPublicId = uploadResult.publicId;
      
      logger.info({ 
        fileId: cloudPublicId, 
        url: cloudUrl,
        originalName: file.originalname 
      }, 'File uploaded to cloud storage');
    } catch (uploadErr) {
      logger.error({ error: uploadErr }, 'Failed to upload file to cloud storage');
      // Clean up temp file and fail the request
      await storageService.cleanupLocalFile(tempPath);
      res.status(500).json({ error: 'Failed to upload file to cloud storage. Please check Cloudinary configuration.' });
      return;
    }

    // Clean up temporary local file
    await storageService.cleanupLocalFile(tempPath);

    // Save file document with cloud URL
    const fileDoc = new FileDoc({
      ownerId: req.user.sub,
      uri: cloudUrl, // Cloud URL instead of local path
      cloudPublicId, // Store for future operations (delete, etc.)
      mime: file.mimetype,
      size: file.size,
      kind,
      transcripts: text ? [{ lang: 'en', text }] : [],
    });

    await fileDoc.save();

    // Add chunks to retrieval DB under collection (conversation-specific or provided)
    const collection = body.collection || (body.conversationId ? `conversation_${body.conversationId}` : 'uploads');
    if (text && text.trim().length > 0) {
      const chunks = chunkText(text, 1200).map((chunk) => ({
        collection,
        docId: fileDoc._id.toString(),
        chunk,
        title: file.originalname,
        url: cloudUrl, // Use cloud URL for retrieval references
        metadata: { mime: file.mimetype, ownerId: req.user!.sub }
      }));

      await retrievalService.addChunks(chunks);
    }

    // Optionally attach the file to a conversation message if conversationId provided
    if (body.conversationId) {
      const Message = (await import('../db/models')).Message;
      const message = new Message({
        conversationId: body.conversationId,
        role: 'user',
        text: `Uploaded file: ${file.originalname}`,
        attachments: [fileDoc._id]
      });
      await message.save();
    }

    res.json({
      success: true,
      fileId: fileDoc._id,
      uri: fileDoc.uri,
      kind,
      textExtracted: !!text && text.trim().length > 0,
    });
  } catch (error) {
    logger.error({ error }, 'File upload failed');
    res.status(500).json({ error: 'File upload failed' });
  }
});

export default router;
