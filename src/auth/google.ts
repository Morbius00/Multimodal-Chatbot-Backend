import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { env } from '../config/env';
import { User } from '../db/models';
import { generateToken, generateRefreshToken, hashPassword } from './jwt';
import { logger } from '../utils/logger';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export type GooglePayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GooglePayload> {
  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('Invalid Google ID token payload');
  return payload as GooglePayload;
}

/**
 * Sign in (or up) using a Google id token. Returns user object and tokens.
 */
export async function signInWithGoogle(idToken: string) {
  const payload = await verifyGoogleIdToken(idToken);

  if (!payload.email) {
    throw new Error('Google account has no email');
  }

  // Optionally require email_verified
  if (payload.email_verified === false) {
    logger.warn({ email: payload.email }, 'Google email not verified');
  }

  let user = await User.findOne({ email: payload.email.toLowerCase() });

  if (!user) {
    // Create a random password (not used) for the user
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashed = await hashPassword(randomPassword);

    user = new User({
      email: payload.email.toLowerCase(),
      password: hashed,
      name: payload.name || payload.email.split('@')[0],
      metadata: { googleId: payload.sub, avatar: payload.picture },
    });

    await user.save();
    logger.info({ userId: user._id, email: user.email }, 'Created new user from Google sign-in');
  } else {
    // Update metadata if needed
    user.metadata = { ...(user.metadata || {}), googleId: payload.sub, avatar: payload.picture };
    user.lastLogin = new Date();
    await user.save();
    logger.info({ userId: user._id, email: user.email }, 'Existing user signed in with Google');
  }

  const token = generateToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
    refreshToken,
  };
}

export default { verifyGoogleIdToken, signInWithGoogle };
