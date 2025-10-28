import { Router } from 'express';
import { z } from 'zod';
import { User } from '../db/models';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken, authMiddleware, AuthenticatedRequest } from '../auth/jwt';
import { logger } from '../utils/logger';
import { signInWithGoogle } from '../auth/google';

const router = Router();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']).optional().default('user'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password
 *                 example: password123
 *               name:
 *                 type: string
 *                 description: User full name
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 description: User role
 *                 example: user
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     name:
 *                       type: string
 *                       description: User name
 *                     role:
 *                       type: string
 *                       description: User role
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Invalid request data or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = RegisterSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ 
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
      return;
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
    });
    
    await user.save();
    
    // Generate tokens
    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());
    
    logger.info({ 
      userId: user._id, 
      email: user.email,
      role: user.role 
    }, 'User registered successfully');
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
      return;
    }
    
    logger.error({ error }, 'User registration failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: User password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     name:
 *                       type: string
 *                       description: User name
 *                     role:
 *                       type: string
 *                       description: User role
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }
    
    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
      return;
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());
    
    logger.info({ 
      userId: user._id, 
      email: user.email 
    }, 'User logged in successfully');
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
      return;
    }
    
    logger.error({ error }, 'User login failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 token:
 *                   type: string
 *                   description: New JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: New JWT refresh token
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);
    
    // Verify refresh token
    const payload = verifyToken(refreshToken);
    
    // Check if it's a refresh token
    if ((payload as any).type !== 'refresh') {
      res.status(401).json({ 
        error: 'Invalid token type',
        message: 'Token is not a refresh token'
      });
      return;
    }
    
    // Find user
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
      return;
    }
    
    // Generate new tokens
    const newToken = generateToken(user._id.toString(), user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString());
    
    logger.info({ 
      userId: user._id, 
      email: user.email 
    }, 'Token refreshed successfully');
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
      return;
    }
    
    logger.error({ error }, 'Token refresh failed');
    res.status(401).json({ 
      error: 'Invalid refresh token',
      message: 'Could not refresh token'
    });
  }
});

// POST /auth/google - Sign in with Google ID token
router.post('/google', async (req, res) => {
  try {
    const schema = z.object({ idToken: z.string().min(1) });
    const { idToken } = schema.parse(req.body);

    const result = await signInWithGoogle(idToken);

    res.json({
      success: true,
      message: 'Signed in with Google successfully',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
      return;
    }

    logger.error({ error }, 'Google sign-in failed');
    res.status(401).json({ error: 'Google sign-in failed', message: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Get the profile of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     name:
 *                       type: string
 *                       description: User name
 *                     role:
 *                       type: string
 *                       description: User role
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                       description: Last login timestamp
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /auth/me - Get current user profile
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const user = await User.findById(req.user.sub).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get user profile failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
