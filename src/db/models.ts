import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Type definitions
export type Id = string;

// Zod schemas for validation
export const AgentSchema = z.object({
  key: z.enum(['general', 'education', 'finance', 'medical', 'technology', 'legal', 'creative', 'language', 'business']).or(z.string()),
  displayName: z.string(),
  systemPrompt: z.string(),
  guardrails: z.object({
    medicalDisclaimer: z.boolean().optional(),
    financialDisclaimer: z.boolean().optional(),
    legalDisclaimer: z.boolean().optional(),
  }),
  enabledTools: z.array(z.string()),
  retrieval: z.object({
    collections: z.array(z.string()),
    topK: z.number(),
  }),
  model: z.object({
    provider: z.literal('google'),
    name: z.string(),
  }),
  temperature: z.number(),
  maxTokens: z.number(),
});

export const ConversationSchema = z.object({
  userId: z.string(),
  agentKey: z.string(),
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const MessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  text: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  toolCall: z.object({
    toolId: z.string(),
    name: z.string(),
    args: z.any(),
    result: z.any().optional(),
  }).optional(),
  citations: z.array(z.object({
    sourceId: z.string(),
    uri: z.string().optional(),
    label: z.string().optional(),
  })).optional(),
});

export const FileDocSchema = z.object({
  ownerId: z.string(),
  uri: z.string(), // Cloud URL (Cloudinary secure_url)
  mime: z.string(),
  size: z.number(),
  kind: z.enum(['image', 'audio', 'pdf', 'doc', 'other']),
  cloudPublicId: z.string().optional(), // Cloudinary public ID for file management
  transcripts: z.array(z.object({
    lang: z.string(),
    text: z.string(),
  })).optional(),
  ocrText: z.string().optional(),
  hash: z.string().optional(),
});

export const ToolSchema = z.object({
  name: z.string(),
  version: z.string(),
  jsonSchema: z.any(),
  endpointKind: z.enum(['internal', 'external']),
  endpointRef: z.string(),
  timeoutMs: z.number(),
  allowedAgents: z.array(z.string()),
});

export const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']).default('user'),
  isActive: z.boolean().default(true),
  lastLogin: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export const KnowledgeChunkSchema = z.object({
  collection: z.string(),
  docId: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  chunk: z.string(),
  embedding: z.array(z.number()),
  metadata: z.record(z.any()).optional(),
});

// Mongoose schemas
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
});

const agentSchema = new Schema({
  key: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  systemPrompt: { type: String, required: true },
  guardrails: {
    medicalDisclaimer: { type: Boolean, default: false },
    financialDisclaimer: { type: Boolean, default: false },
    legalDisclaimer: { type: Boolean, default: false },
  },
  enabledTools: [{ type: String }],
  retrieval: {
    collections: [{ type: String }],
    topK: { type: Number, default: 5 },
  },
  model: {
    provider: { type: String, default: 'google' },
    name: { type: String, required: true },
  },
  temperature: { type: Number, default: 0.4 },
  maxTokens: { type: Number, default: 1200 },
}, {
  timestamps: true,
});

const conversationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  agentKey: { type: String, required: true, index: true },
  title: { type: String },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
});

const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'tool', 'system'], required: true },
  text: { type: String },
  attachments: [{ type: Schema.Types.ObjectId, ref: 'FileDoc' }],
  toolCall: {
    toolId: { type: String },
    name: { type: String },
    args: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
  },
  citations: [{
    sourceId: { type: String },
    uri: { type: String },
    label: { type: String },
  }],
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
});

const fileDocSchema = new Schema({
  ownerId: { type: String, required: true, index: true },
  uri: { type: String, required: true }, // Cloud URL (Cloudinary secure_url)
  mime: { type: String, required: true },
  size: { type: Number, required: true },
  kind: { type: String, enum: ['image', 'audio', 'pdf', 'doc', 'other'], required: true },
  cloudPublicId: { type: String }, // Cloudinary public ID for file management
  transcripts: [{
    lang: { type: String },
    text: { type: String },
  }],
  ocrText: { type: String },
  hash: { type: String },
}, {
  timestamps: true,
});

const toolSchema = new Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  jsonSchema: { type: Schema.Types.Mixed, required: true },
  endpointKind: { type: String, enum: ['internal', 'external'], required: true },
  endpointRef: { type: String, required: true },
  timeoutMs: { type: Number, default: 30000 },
  allowedAgents: [{ type: String }],
}, {
  timestamps: true,
});

const knowledgeChunkSchema = new Schema({
  collection: { type: String, required: true },
  docId: { type: String, required: true },
  title: { type: String },
  url: { type: String },
  chunk: { type: String, required: true },
  embedding: { type: [Number], required: true },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
  suppressReservedKeysWarning: true,
});

// Create indexes
messageSchema.index({ conversationId: 1, createdAt: 1 });
knowledgeChunkSchema.index({ collection: 1 });
// Note: Vector search index will be created in MongoDB Atlas
toolSchema.index({ name: 1, version: 1 });

// Models
export const User = mongoose.model('User', userSchema);
export const Agent = mongoose.model('Agent', agentSchema);
export const Conversation = mongoose.model('Conversation', conversationSchema);
export const Message = mongoose.model('Message', messageSchema);
export const FileDoc = mongoose.model('FileDoc', fileDocSchema);
export const Tool = mongoose.model('Tool', toolSchema);
export const KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);

// TypeScript interfaces
export interface IUser {
  _id: Id;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgent {
  _id: Id;
  key: string;
  displayName: string;
  systemPrompt: string;
  guardrails: {
    medicalDisclaimer?: boolean;
    financialDisclaimer?: boolean;
    legalDisclaimer?: boolean;
  };
  enabledTools: Id[];
  retrieval: {
    collections: string[];
    topK: number;
  };
  model: {
    provider: 'google';
    name: string;
  };
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  _id: Id;
  userId: Id;
  agentKey: string;
  title?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: Id;
  conversationId: Id;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text?: string;
  attachments?: Id[];
  toolCall?: {
    toolId: Id;
    name: string;
    args: any;
    result?: any;
  };
  citations?: Array<{
    sourceId: string;
    uri?: string;
    label?: string;
  }>;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileDoc {
  _id: Id;
  ownerId: Id;
  uri: string; // Cloud URL (Cloudinary secure_url)
  mime: string;
  size: number;
  kind: 'image' | 'audio' | 'pdf' | 'doc' | 'other';
  cloudPublicId?: string; // Cloudinary public ID for file management
  transcripts?: Array<{
    lang: string;
    text: string;
  }>;
  ocrText?: string;
  hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITool {
  _id: Id;
  name: string;
  version: string;
  jsonSchema: any;
  endpointKind: 'internal' | 'external';
  endpointRef: string;
  timeoutMs: number;
  allowedAgents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IKnowledgeChunk {
  _id: Id;
  collection: string;
  docId: string;
  title?: string;
  url?: string;
  chunk: string;
  embedding: number[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
