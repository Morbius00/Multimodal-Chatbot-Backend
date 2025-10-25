# Multimodal Chat Backend API Documentation

## Base URL
```
http://localhost:8000
```

## Table of Contents
- [Authentication](#authentication)
- [Agents](#agents)
- [Conversations](#conversations)
- [Messages](#messages)
- [Chat](#chat)
- [Admin - Knowledge Base](#admin---knowledge-base)
- [System](#system)

---

## Authentication

All authenticated endpoints require an `Authorization` header with a Bearer token:
```
Authorization: Bearer <your_jwt_token>
```

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "user"
}
```

**Fields:**
- `email` (required, string): Valid email address
- `password` (required, string): Minimum 6 characters
- `name` (required, string): User's full name
- `role` (optional, string): Either "user" or "admin" (default: "user")

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid data or user already exists
- `500 Internal Server Error`: Server error

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and get JWT tokens

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Fields:**
- `email` (required, string): User email
- `password` (required, string): User password

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Invalid credentials or account disabled
- `500 Internal Server Error`: Server error

---

### 3. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Get a new access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Fields:**
- `refreshToken` (required, string): Valid refresh token

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Invalid or expired refresh token
- `500 Internal Server Error`: Server error

---

### 4. Get Current User Profile

**Endpoint:** `GET /api/auth/me`

**Description:** Get profile of the currently authenticated user

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "lastLogin": "2025-10-25T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## Agents

### 5. Get List of Agents

**Endpoint:** `GET /api/agents`

**Description:** Retrieve a paginated list of all available agents

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `limit` (optional, integer, default: 10): Number of agents to return
- `offset` (optional, integer, default: 0): Number of agents to skip

**Example Request:**
```
GET /api/agents?limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "agents": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "key": "general",
      "displayName": "General Assistant",
      "guardrails": {
        "medicalDisclaimer": false,
        "financialDisclaimer": false
      },
      "enabledTools": ["search", "calculator"],
      "retrieval": {
        "collections": ["global_faq"],
        "topK": 5
      },
      "model": {
        "provider": "google",
        "name": "gemini-1.5-flash"
      },
      "temperature": 0.4,
      "maxTokens": 1200,
      "createdAt": "2025-10-20T10:00:00.000Z",
      "updatedAt": "2025-10-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 4,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### 6. Get Specific Agent Details

**Endpoint:** `GET /api/agents/:key`

**Description:** Retrieve details for a specific agent by key

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Path Parameters:**
- `key` (required, string): Agent key identifier (e.g., "general", "education", "finance", "medical")

**Example Request:**
```
GET /api/agents/general
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "key": "general",
  "displayName": "General Assistant",
  "guardrails": {
    "medicalDisclaimer": false,
    "financialDisclaimer": false
  },
  "enabledTools": ["search", "calculator"],
  "retrieval": {
    "collections": ["global_faq"],
    "topK": 5
  },
  "model": {
    "provider": "google",
    "name": "gemini-1.5-flash"
  },
  "temperature": 0.4,
  "maxTokens": 1200,
  "createdAt": "2025-10-20T10:00:00.000Z",
  "updatedAt": "2025-10-20T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Server error

---

## Conversations

### 7. Create a New Conversation

**Endpoint:** `POST /api/conversations`

**Description:** Create a new conversation with a specific agent

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "agentKey": "general",
  "title": "My Chat Session",
  "metadata": {
    "source": "web",
    "priority": "normal"
  }
}
```

**Fields:**
- `agentKey` (required, string): Agent key for this conversation (e.g., "general", "education", "finance", "medical")
- `title` (optional, string): Conversation title
- `metadata` (optional, object): Additional conversation metadata

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "agentKey": "general",
  "title": "My Chat Session",
  "createdAt": "2025-10-25T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### 8. List User's Conversations

**Endpoint:** `GET /api/conversations`

**Description:** Get a paginated list of user's conversations

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `limit` (optional, integer, default: 20): Number of conversations to return
- `offset` (optional, integer, default: 0): Number of conversations to skip
- `agentKey` (optional, string): Filter by agent key

**Example Request:**
```
GET /api/conversations?limit=20&offset=0&agentKey=general
```

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "agentKey": "general",
      "title": "My Chat Session",
      "metadata": {
        "source": "web"
      },
      "createdAt": "2025-10-25T10:30:00.000Z",
      "updatedAt": "2025-10-25T10:35:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### 9. Get Specific Conversation

**Endpoint:** `GET /api/conversations/:id`

**Description:** Get details of a specific conversation

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Path Parameters:**
- `id` (required, string): Conversation ID

**Example Request:**
```
GET /api/conversations/507f1f77bcf86cd799439012
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "agentKey": "general",
  "title": "My Chat Session",
  "metadata": {
    "source": "web"
  },
  "createdAt": "2025-10-25T10:30:00.000Z",
  "updatedAt": "2025-10-25T10:35:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Conversation not found
- `500 Internal Server Error`: Server error

---

### 10. Get Conversation Messages

**Endpoint:** `GET /api/conversations/:id/messages`

**Description:** Get all messages for a specific conversation

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Path Parameters:**
- `id` (required, string): Conversation ID

**Query Parameters:**
- `limit` (optional, integer, default: 50): Number of messages to return
- `cursor` (optional, string): Message ID for cursor-based pagination

**Example Request:**
```
GET /api/conversations/507f1f77bcf86cd799439012/messages?limit=50
```

**Response (200 OK):**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "conversationId": "507f1f77bcf86cd799439012",
      "role": "user",
      "text": "Hello, how are you?",
      "attachments": [],
      "createdAt": "2025-10-25T10:31:00.000Z",
      "updatedAt": "2025-10-25T10:31:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "conversationId": "507f1f77bcf86cd799439012",
      "role": "assistant",
      "text": "Hello! I'm doing great, thank you for asking. How can I assist you today?",
      "attachments": [],
      "citations": [],
      "createdAt": "2025-10-25T10:31:05.000Z",
      "updatedAt": "2025-10-25T10:31:05.000Z"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Conversation not found
- `500 Internal Server Error`: Server error

---

### 11. Delete Conversation

**Endpoint:** `DELETE /api/conversations/:id`

**Description:** Delete a conversation and all its messages

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Path Parameters:**
- `id` (required, string): Conversation ID

**Example Request:**
```
DELETE /api/conversations/507f1f77bcf86cd799439012
```

**Response (204 No Content):**
```
No response body
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Conversation not found
- `500 Internal Server Error`: Server error

---

## Messages

### 12. Get All Messages (Admin)

**Endpoint:** `GET /api/messages`

**Description:** Get messages across all user's conversations (with pagination)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `limit` (optional, integer, default: 50): Number of messages to return
- `cursor` (optional, string): Message ID for cursor-based pagination

**Example Request:**
```
GET /api/messages?limit=50
```

**Response (200 OK):**
```json
{
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "conversationId": "507f1f77bcf86cd799439012",
      "role": "user",
      "text": "Hello, how are you?",
      "attachments": [],
      "createdAt": "2025-10-25T10:31:00.000Z",
      "updatedAt": "2025-10-25T10:31:00.000Z"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### 13. Get Specific Message

**Endpoint:** `GET /api/messages/:id`

**Description:** Get details of a specific message

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Path Parameters:**
- `id` (required, string): Message ID

**Example Request:**
```
GET /api/messages/507f1f77bcf86cd799439013
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "conversationId": "507f1f77bcf86cd799439012",
  "role": "user",
  "text": "Hello, how are you?",
  "attachments": [],
  "createdAt": "2025-10-25T10:31:00.000Z",
  "updatedAt": "2025-10-25T10:31:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Message not found
- `500 Internal Server Error`: Server error

---

### 14. Submit Message Feedback

**Endpoint:** `POST /api/messages/:id/feedback`

**Description:** Submit feedback (thumbs up/down) for an assistant message

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Path Parameters:**
- `id` (required, string): Message ID

**Request Body:**
```json
{
  "rating": "up",
  "note": "Very helpful response!"
}
```

**Fields:**
- `rating` (required, string): Either "up" or "down"
- `note` (optional, string): Additional feedback note

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Message not found
- `500 Internal Server Error`: Server error

---

## Chat

### 15. Send Chat Message (Non-Streaming)

**Endpoint:** `POST /api/chat`

**Description:** Send a chat message and get a complete response (non-streaming)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "conversationId": "507f1f77bcf86cd799439012",
  "text": "Hello, how are you?",
  "agentKey": "general",
  "attachmentIds": ["file_id_1", "file_id_2"]
}
```

**Fields:**
- `conversationId` (required, string): Conversation ID
- `text` (required, string): Message text
- `agentKey` (optional, string): Agent key (uses conversation's agent if not provided)
- `attachmentIds` (optional, array of strings): List of file attachment IDs

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "507f1f77bcf86cd799439014",
  "message": "Hello! I'm doing great, thank you for asking. How can I assist you today?"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Conversation not found
- `500 Internal Server Error`: Server error or chat processing failed

---

### 16. Send Chat Message (Streaming - SSE)

**Endpoint:** `POST /api/chat/stream`

**Description:** Send a chat message and receive response via Server-Sent Events (SSE)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Request Body:**
```json
{
  "conversationId": "507f1f77bcf86cd799439012",
  "text": "Hello, how are you?",
  "agentKey": "general",
  "attachmentIds": ["file_id_1"]
}
```

**Fields:**
- `conversationId` (required, string): Conversation ID
- `text` (required, string): Message text
- `agentKey` (optional, string): Agent key (uses conversation's agent if not provided)
- `attachmentIds` (optional, array of strings): List of file attachment IDs

**Response (200 OK - SSE Stream):**

The response is a Server-Sent Events stream with the following event types:

**Event Type: `final`**
```json
{
  "type": "final",
  "data": {
    "messageId": "507f1f77bcf86cd799439014",
    "success": true
  }
}
```

**Event Type: `error`**
```json
{
  "type": "error",
  "data": {
    "message": "Error message here"
  }
}
```

**Frontend Integration Example (JavaScript):**
```javascript
const eventSource = new EventSource('/api/chat/stream', {
  headers: {
    'Authorization': 'Bearer ' + yourToken
  }
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'final') {
    console.log('Message ID:', data.data.messageId);
    eventSource.close();
  } else if (data.type === 'error') {
    console.error('Error:', data.data.message);
    eventSource.close();
  }
});
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Conversation not found
- `500 Internal Server Error`: Server error

---

## Admin - Knowledge Base

**Note:** All knowledge base endpoints require admin role authentication.

### 17. Import Knowledge Documents

**Endpoint:** `POST /api/admin/knowledge/import`

**Description:** Import knowledge documents into the knowledge base

**Headers:**
```
Authorization: Bearer <your_admin_jwt_token>
```

**Request Body:**
```json
{
  "collection": "global_faq",
  "documents": [
    {
      "docId": "doc_001",
      "title": "Getting Started Guide",
      "url": "https://example.com/docs/getting-started",
      "content": "This is the content of the document...",
      "metadata": {
        "category": "tutorial",
        "language": "en"
      }
    }
  ],
  "chunkOptions": {
    "maxChunkSize": 1000,
    "overlap": 100,
    "minChunkSize": 50,
    "preserveSentences": true,
    "preserveParagraphs": true
  }
}
```

**Fields:**
- `collection` (required, string): Collection name (e.g., "global_faq", "education_kb")
- `documents` (required, array): Array of document objects
  - `docId` (required, string): Unique document ID
  - `title` (optional, string): Document title
  - `url` (optional, string): Document source URL
  - `content` (required, string): Document content
  - `metadata` (optional, object): Additional metadata
- `chunkOptions` (optional, object): Chunking options
  - `maxChunkSize` (optional, integer, default: 1000): Maximum chunk size
  - `overlap` (optional, integer, default: 100): Overlap between chunks
  - `minChunkSize` (optional, integer, default: 50): Minimum chunk size
  - `preserveSentences` (optional, boolean, default: true): Preserve sentence boundaries
  - `preserveParagraphs` (optional, boolean, default: true): Preserve paragraph boundaries

**Response (200 OK):**
```json
{
  "collection": "global_faq",
  "totalDocuments": 1,
  "totalChunks": 15,
  "errors": [],
  "success": true
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not admin)
- `500 Internal Server Error`: Server error

---

### 18. Search Knowledge Base

**Endpoint:** `POST /api/admin/knowledge/search`

**Description:** Search the knowledge base

**Headers:**
```
Authorization: Bearer <your_admin_jwt_token>
```

**Request Body:**
```json
{
  "query": "How do I get started?",
  "collections": ["global_faq", "education_kb"],
  "topK": 10,
  "minScore": 0.5
}
```

**Fields:**
- `query` (required, string): Search query
- `collections` (optional, array of strings, default: ["global_faq"]): Collections to search
- `topK` (optional, integer, default: 10): Number of top results to return
- `minScore` (optional, number, default: 0.5): Minimum similarity score (0-1)

**Response (200 OK):**
```json
{
  "query": "How do I get started?",
  "results": [
    {
      "docId": "doc_001",
      "title": "Getting Started Guide",
      "url": "https://example.com/docs/getting-started",
      "chunk": "This is a relevant chunk of text...",
      "score": 0.85,
      "metadata": {
        "category": "tutorial"
      }
    }
  ],
  "totalResults": 1
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not admin)
- `500 Internal Server Error`: Server error

---

### 19. List Knowledge Collections

**Endpoint:** `GET /api/admin/knowledge/collections`

**Description:** Get list of all knowledge collections with statistics

**Headers:**
```
Authorization: Bearer <your_admin_jwt_token>
```

**Response (200 OK):**
```json
{
  "collections": [
    {
      "name": "global_faq",
      "totalChunks": 150,
      "totalDocuments": 10,
      "avgChunkLength": 850
    },
    {
      "name": "education_kb",
      "totalChunks": 300,
      "totalDocuments": 25,
      "avgChunkLength": 920
    }
  ],
  "totalCollections": 2
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not admin)
- `500 Internal Server Error`: Server error

---

### 20. Delete Knowledge Collection

**Endpoint:** `DELETE /api/admin/knowledge/collections/:collection`

**Description:** Delete all chunks in a specific collection

**Headers:**
```
Authorization: Bearer <your_admin_jwt_token>
```

**Path Parameters:**
- `collection` (required, string): Collection name

**Example Request:**
```
DELETE /api/admin/knowledge/collections/global_faq
```

**Response (501 Not Implemented):**
```json
{
  "error": "Collection deletion not yet implemented",
  "message": "This feature will be available in a future update"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not admin)
- `500 Internal Server Error`: Server error
- `501 Not Implemented`: Feature not yet available

---

### 21. Get Knowledge Base Statistics

**Endpoint:** `GET /api/admin/knowledge/stats`

**Description:** Get overall knowledge base statistics

**Headers:**
```
Authorization: Bearer <your_admin_jwt_token>
```

**Response (200 OK):**
```json
{
  "totalCollections": 4,
  "totalChunks": 1500,
  "totalDocuments": 100,
  "avgChunkLength": 875
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not admin)
- `500 Internal Server Error`: Server error

---

## System

### 22. Health Check

**Endpoint:** `GET /health`

**Description:** Check server health and status

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-25T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "development",
  "port": 8000,
  "memory": {
    "used": "128 MB",
    "total": "256 MB"
  },
  "services": {
    "database": "connected",
    "api": "operational"
  }
}
```

---

## Common Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "details": [] // Only included for validation errors
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource successfully created
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `501 Not Implemented`: Feature not yet implemented

---

## Authentication Flow

### Step 1: Register or Login
```javascript
// Register
const registerResponse = await fetch('http://localhost:8000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  })
});

const { token, refreshToken } = await registerResponse.json();

// Store tokens securely
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);
```

### Step 2: Make Authenticated Requests
```javascript
const response = await fetch('http://localhost:8000/api/conversations', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  }
});
```

### Step 3: Refresh Token When Expired
```javascript
const refreshResponse = await fetch('http://localhost:8000/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

const { token, refreshToken: newRefreshToken } = await refreshResponse.json();

localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', newRefreshToken);
```

---

## Typical User Flow

### Creating a Chat Conversation

1. **Register/Login** to get authentication token
2. **Get available agents** (`GET /api/agents`)
3. **Create a conversation** with chosen agent (`POST /api/conversations`)
4. **Send chat messages** (`POST /api/chat` or `POST /api/chat/stream`)
5. **Retrieve conversation messages** (`GET /api/conversations/:id/messages`)
6. **Submit feedback** on responses (`POST /api/messages/:id/feedback`)

### Example Complete Flow
```javascript
// 1. Login
const loginRes = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
});
const { token } = await loginRes.json();

// 2. Create conversation
const convRes = await fetch('http://localhost:8000/api/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ agentKey: 'general', title: 'My Chat' })
});
const { id: conversationId } = await convRes.json();

// 3. Send message
const chatRes = await fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversationId: conversationId,
    text: 'Hello, how are you?'
  })
});
const { messageId, message } = await chatRes.json();

console.log('Assistant reply:', message);
```

---

## Notes for Frontend Developers

1. **Token Management**: 
   - Store tokens securely (use httpOnly cookies in production)
   - Implement automatic token refresh logic
   - Access token expires in 24 hours
   - Refresh token expires in 7 days

2. **Error Handling**:
   - Always check HTTP status codes
   - Handle 401 errors by refreshing token or redirecting to login
   - Display user-friendly error messages from the `message` field

3. **Pagination**:
   - Use `limit` and `offset` for conversations
   - Use cursor-based pagination for messages (better performance)

4. **Real-time Chat**:
   - Use SSE endpoint (`/api/chat/stream`) for real-time streaming responses
   - Fallback to non-streaming endpoint if SSE is not supported

5. **File Attachments**:
   - File upload endpoint is not yet implemented
   - `attachmentIds` field is prepared for future file upload feature

6. **CORS**:
   - Backend allows `http://localhost:3000` by default
   - Configure `ALLOWED_ORIGINS` environment variable for production

7. **Rate Limiting**:
   - Not currently implemented, but may be added in future
   - Plan for graceful degradation if rate limits are hit

---

## Support

For any issues or questions about the API, please contact the backend development team.

**Last Updated:** October 25, 2025
**API Version:** 1.0.0
