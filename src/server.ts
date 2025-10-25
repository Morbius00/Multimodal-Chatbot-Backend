import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { connectMongoDB } from './db/mongo';
import { logger } from './utils/logger';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';

// Import routes
import authRouter from './routes/auth';
import agentsRouter from './routes/agents';
import conversationsRouter from './routes/conversations';
import messagesRouter from './routes/messages';
import chatRouter from './routes/chat';
import adminKnowledgeRouter from './routes/admin.knowledge';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
    }, 'HTTP request');
  });
  
  next();
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Multimodal Chat API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check server health and status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    port: env.PORT,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
    services: {
      database: 'connected', // This could be enhanced to actually check DB connection
      api: 'operational'
    }
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin/knowledge', adminKnowledgeRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method,
  }, 'Unhandled error');
  
  res.status(500).json({ 
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { details: error.message }),
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    
    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info({ 
        port: env.PORT, 
        env: env.NODE_ENV,
        healthEndpoint: `http://localhost:${env.PORT}/health`,
        apiEndpoints: [
          '/api/auth',
          '/api/agents',
          '/api/conversations', 
          '/api/messages',
          '/api/chat',
          '/api/admin/knowledge'
        ]
      }, '🚀 Multimodal Chat Backend Server Successfully Started!');
      
      // Additional console output for better visibility
      console.log('\n' + '='.repeat(60));
      console.log('🚀 MULTIMODAL CHAT BACKEND SERVER');
      console.log('='.repeat(60));
      console.log(`✅ Server running on port: ${env.PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${env.PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${env.PORT}/api-docs`);
      console.log(`📊 API endpoints available:`);
      console.log(`   • /api/auth (login, register, refresh)`);
      console.log(`   • /api/agents`);
      console.log(`   • /api/conversations`);
      console.log(`   • /api/messages`);
      console.log(`   • /api/chat`);
      console.log(`   • /api/admin/knowledge`);
      console.log('='.repeat(60) + '\n');
    });
    
    // Graceful shutdown
    const gracefulShutdown = () => {
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
