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

const upload = multer({ dest: 'uploads/' });
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
router.post('/', authMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res) => {
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
    const destDir = path.join('uploads', String(Date.now()));
    await fs.mkdir(destDir, { recursive: true });
    const destPath = path.join(destDir, file.originalname);
    await fs.rename(file.path, destPath);

    // Extract text (pdf/image)
    let text = '';
    try {
      text = await extractTextFromFile(destPath, kind);
    } catch (err) {
      logger.error({ err, file: destPath }, 'Failed to extract text from file');
    }

    // Save file document
    const fileDoc = new FileDoc({
      ownerId: req.user.sub,
      uri: destPath,
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
        url: destPath,
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
