import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('8080').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  MONGO_URL: z.string().default('mongodb://localhost:27017/multimodal-chat'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // Google GenAI
  GOOGLE_GENAI_API_KEY: z.string().default('demo-key'),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  
  // Object Storage
  OBJECT_STORE_BUCKET: z.string().default('multimodal-chat-files'),
  OBJECT_STORE_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().default('demo-key'),
  AWS_SECRET_ACCESS_KEY: z.string().default('demo-secret'),
  
  // JWT Configuration
  JWT_PUBLIC_KEY: z.string().default('demo-public-key'),
  JWT_AUDIENCE: z.string().default('assessli-app'),
  JWT_ISSUER: z.string().default('assessli-auth'),
  
  // Optional
  OPENAI_API_KEY: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
