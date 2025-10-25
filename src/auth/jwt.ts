import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const JwtPayloadSchema = z.object({
  sub: z.string(), // user ID
  aud: z.string(),
  iss: z.string(),
  iat: z.number(),
  exp: z.number(),
  // Add any additional claims as needed
  role: z.string().optional(),
  tenant: z.string().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT token generation
export function generateToken(userId: string, role: string = 'user', additionalClaims: Record<string, any> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    aud: env.JWT_AUDIENCE,
    iss: env.JWT_ISSUER,
    iat: now,
    exp: now + (24 * 60 * 60), // 24 hours
    role,
    ...additionalClaims,
  };

  return jwt.sign(payload, env.JWT_PUBLIC_KEY);
}

export function generateRefreshToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    aud: env.JWT_AUDIENCE,
    iss: env.JWT_ISSUER,
    iat: now,
    exp: now + (7 * 24 * 60 * 60), // 7 days
    type: 'refresh',
  };

  return jwt.sign(payload, env.JWT_PUBLIC_KEY);
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      audience: env.JWT_AUDIENCE,
      issuer: env.JWT_ISSUER,
    }) as any;
    
    return JwtPayloadSchema.parse(decoded);
  } catch (error) {
    logger.error({ error, token: token.substring(0, 20) + '...' }, 'JWT verification failed');
    throw new Error('Invalid token');
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    logger.error({ error }, 'Authentication failed');
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    logger.warn({ error }, 'Optional authentication failed, continuing without auth');
    next();
  }
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (req.user.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}
