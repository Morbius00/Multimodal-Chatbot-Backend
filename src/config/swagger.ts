import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multimodal Chat Backend API',
      version: '1.0.0',
      description: 'A comprehensive API for managing agents, conversations, messages, and chat functionality with multimodal support.',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:3001`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
      },
      schemas: {
        Agent: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Unique agent identifier',
              example: '507f1f77bcf86cd799439011',
            },
            key: {
              type: 'string',
              description: 'Agent key identifier',
              example: 'general',
            },
            displayName: {
              type: 'string',
              description: 'Human-readable agent name',
              example: 'General Assistant',
            },
            guardrails: {
              type: 'object',
              properties: {
                medicalDisclaimer: {
                  type: 'boolean',
                  description: 'Whether medical disclaimer is required',
                  default: false,
                },
                financialDisclaimer: {
                  type: 'boolean',
                  description: 'Whether financial disclaimer is required',
                  default: false,
                },
              },
            },
            enabledTools: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of enabled tools for this agent',
              example: ['search', 'calculator'],
            },
            retrieval: {
              type: 'object',
              properties: {
                collections: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Knowledge collections to search',
                  example: ['general_faq'],
                },
                topK: {
                  type: 'number',
                  description: 'Number of top results to retrieve',
                  default: 5,
                },
              },
            },
            model: {
              type: 'object',
              properties: {
                provider: {
                  type: 'string',
                  enum: ['google'],
                  description: 'AI model provider',
                  example: 'google',
                },
                name: {
                  type: 'string',
                  description: 'Model name',
                  example: 'gemini-pro',
                },
              },
            },
            temperature: {
              type: 'number',
              description: 'Model temperature for response generation',
              minimum: 0,
              maximum: 2,
              default: 0.4,
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum tokens in response',
              default: 1200,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Unique conversation identifier',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'string',
              description: 'User identifier',
              example: 'user_123',
            },
            agentKey: {
              type: 'string',
              description: 'Agent key for this conversation',
              example: 'general',
            },
            title: {
              type: 'string',
              description: 'Conversation title',
              example: 'My Chat Session',
            },
            metadata: {
              type: 'object',
              description: 'Additional conversation metadata',
              additionalProperties: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Unique message identifier',
              example: '507f1f77bcf86cd799439011',
            },
            conversationId: {
              type: 'string',
              description: 'Parent conversation identifier',
              example: '507f1f77bcf86cd799439011',
            },
            role: {
              type: 'string',
              enum: ['user', 'assistant', 'tool', 'system'],
              description: 'Message role',
              example: 'user',
            },
            text: {
              type: 'string',
              description: 'Message text content',
              example: 'Hello, how are you?',
            },
            attachments: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of attachment IDs',
              example: ['file_id_1', 'file_id_2'],
            },
            toolCall: {
              type: 'object',
              properties: {
                toolId: {
                  type: 'string',
                  description: 'Tool identifier',
                },
                name: {
                  type: 'string',
                  description: 'Tool name',
                },
                args: {
                  type: 'object',
                  description: 'Tool arguments',
                },
                result: {
                  type: 'object',
                  description: 'Tool execution result',
                },
              },
            },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sourceId: {
                    type: 'string',
                    description: 'Source identifier',
                  },
                  uri: {
                    type: 'string',
                    description: 'Source URI',
                  },
                  label: {
                    type: 'string',
                    description: 'Source label',
                  },
                },
              },
              description: 'Message citations',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Resource not found',
            },
            details: {
              type: 'string',
              description: 'Additional error details (development only)',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request data',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name',
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message',
                  },
                },
              },
              description: 'Validation error details',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of items',
              example: 100,
            },
            limit: {
              type: 'number',
              description: 'Number of items per page',
              example: 20,
            },
            offset: {
              type: 'number',
              description: 'Number of items to skip',
              example: 0,
            },
            hasMore: {
              type: 'boolean',
              description: 'Whether there are more items',
              example: true,
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Server status',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Current server time',
            },
            version: {
              type: 'string',
              description: 'API version',
              example: '1.0.0',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
              example: 3600,
            },
            environment: {
              type: 'string',
              description: 'Environment name',
              example: 'development',
            },
            port: {
              type: 'number',
              description: 'Server port',
              example: 8080,
            },
            memory: {
              type: 'object',
              properties: {
                used: {
                  type: 'string',
                  description: 'Used memory',
                  example: '45 MB',
                },
                total: {
                  type: 'string',
                  description: 'Total memory',
                  example: '128 MB',
                },
              },
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  description: 'Database status',
                  example: 'connected',
                },
                api: {
                  type: 'string',
                  description: 'API status',
                  example: 'operational',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);
