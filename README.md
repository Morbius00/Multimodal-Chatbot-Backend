# Multimodal Multi-Agent Chat Backend

A backend service that powers multiple domain agents (Education, Finance, Medical, General) with domain-scoped RAG, tool allow-lists, strict guardrails, and multimodal ingest capabilities.

## Features

- **Multi-Agent System**: Domain-specific agents with specialized prompts and capabilities
- **Multimodal Support**: Text, image, audio, and PDF processing
- **Cloud File Storage**: Files stored in Cloudinary (free 25GB tier) with public URLs
- **Retrieval-Augmented Generation**: MongoDB Atlas Vector Search for domain-specific knowledge
- **Tool Runtime**: Configurable tools with per-agent allow-lists
- **Streaming Responses**: Server-Sent Events (SSE) for real-time chat
- **Security**: JWT authentication, input validation, and safety guardrails
- **Observability**: Structured logging, metrics, and feedback collection

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: MongoDB with Atlas Vector Search
- **Queue**: BullMQ with Redis
- **AI Provider**: Google GenAI (Gemini)
- **Language**: TypeScript

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Redis
- Google GenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd multimodal-chat-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Seed the database with initial agents:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## Environment Variables

See `env.example` for all required environment variables:

- `MONGO_URL`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `GOOGLE_GENAI_API_KEY`: Google GenAI API key
- `JWT_PUBLIC_KEY`: JWT public key for token verification
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: **Cloud storage credentials (required)** - See [Cloud Storage Setup Guide](docs/CLOUD_STORAGE_SETUP.md)
- And more...

### Google OAuth

- `GOOGLE_CLIENT_ID`: (optional) Google OAuth Client ID used by your frontend to obtain an ID token. If provided, the backend exposes `POST /api/auth/google` which accepts `{ idToken }` and signs the user in (creates an account if it doesn't exist).

### Cloud Storage Setup

**Important**: Files are now stored in **Cloudinary** (free tier: 25GB storage + 25GB bandwidth/month).

1. Sign up for free at: https://cloudinary.com/users/register/free
2. Get your credentials from the dashboard
3. Add to `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

See [CLOUD_STORAGE_SETUP.md](docs/CLOUD_STORAGE_SETUP.md) for detailed instructions.

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /api/agents` - List available agents
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations` - List user conversations
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/messages/:id/feedback` - Submit message feedback

### Admin Endpoints (Coming in Phase 6)

- `POST /api/admin/knowledge/:collection/import` - Import knowledge base
- `POST /api/admin/tools/:name/test` - Test tool configuration

## Agent Configuration

The system includes four pre-configured agents:

1. **General**: General-purpose assistant
2. **Education**: Academic and learning assistance
3. **Finance**: Financial education (no personal advice)
4. **Medical**: Health information (educational only)

Each agent has:
- Specialized system prompts
- Domain-specific retrieval collections
- Allowed tools
- Safety guardrails and disclaimers

## Development

### Project Structure

```
src/
├── config/          # Environment configuration
├── auth/            # JWT authentication
├── routes/          # API route handlers
├── services/        # Business logic services
├── agents/          # Agent configurations
├── tools/           # Tool implementations
├── jobs/            # Background job processors
├── db/              # Database models and connection
└── utils/           # Utility functions
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with initial data
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Implementation Status

### Phase 1 - Foundation ✅
- [x] Project scaffold
- [x] MongoDB setup with models
- [x] JWT authentication
- [x] Basic CRUD endpoints
- [x] Agent registry

### Phase 2 - Chat & Google GenAI (In Progress)
- [ ] Google GenAI provider abstraction
- [ ] SSE streaming endpoint
- [ ] Chat orchestration

### Phase 3 - Retrieval & Guardrails (Planned)
- [ ] Atlas Vector Search integration
- [ ] Output gate implementation
- [ ] Domain-specific guardrails

### Phase 4 - Multimodal & Jobs (Planned)
- [ ] File upload handling
- [ ] BullMQ job processing
- [ ] OCR/STT/Embedding jobs

### Phase 5 - Tools & Safety (Planned)
- [ ] Tool runtime implementation
- [ ] Sample tools (search_docs, etc.)
- [ ] Safety filters

### Phase 6 - Observability & Admin (Planned)
- [ ] Metrics collection
- [ ] Feedback API
- [ ] Admin import endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license here]
