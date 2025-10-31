# Conversation Title Auto-Update Feature

## Overview
Implemented automatic conversation title generation based on the first user message, replacing the generic agent name titles (e.g., "General Assistant", "Education Assistant") with meaningful conversation topics.

## Changes Made

### 1. New Utility Module: `src/utils/conversation.ts`
Created helper functions for conversation title management:

- **`generateConversationTitle(messageText, maxLength)`**
  - Generates a clean, readable title from the first user message
  - Truncates long messages intelligently at word boundaries
  - Maximum default length: 60 characters
  - Capitalizes the first letter
  - Handles edge cases gracefully

- **`shouldUpdateConversationTitle(currentTitle, agentDisplayName)`**
  - Checks if a conversation title needs updating
  - Returns `true` for default agent names or placeholder titles
  - Prevents overwriting user-customized titles

### 2. Updated: `src/routes/chat.ts`
Modified both chat endpoints to automatically update conversation titles:

**Stream Endpoint (`POST /api/chat/stream`):**
- After saving the first user message, checks if it's the first message in the conversation
- If the title is still a default agent name, updates it with the message content
- Non-blocking: title update failures don't affect chat functionality

**Non-Stream Endpoint (`POST /api/chat`):**
- Same automatic title update logic
- Ensures consistency across both endpoints

### 3. Enhanced: `src/routes/conversations.ts`
Added new endpoint for manual title updates:

**New PATCH Endpoint (`PATCH /api/conversations/:id`):**
```typescript
// Request body
{
  "title": "Discussion about Machine Learning",  // optional
  "metadata": { ... }  // optional
}

// Response
{
  "id": "conversation_id",
  "title": "Updated title",
  "metadata": { ... },
  "updatedAt": "2025-10-31T..."
}
```

## How It Works

### Automatic Title Generation Flow:
1. User sends first message to a conversation
2. Message is saved to the database
3. System checks if this is the first user message (`messageCount === 1`)
4. If title is still default (e.g., "General Assistant"), generates new title from message text
5. Updates conversation with meaningful title
6. Logs the update for monitoring

### Example Transformations:
| Original Message | Generated Title |
|-----------------|-----------------|
| "What is machine learning?" | "What is machine learning?" |
| "Can you help me understand the differences between supervised and unsupervised learning in ML?" | "Can you help me understand the differences between..." |
| "hello" | "Hello" |
| "I need help with my project that involves data science and..." | "I need help with my project that involves data..." |

## Benefits

1. **Better User Experience**: Users can easily identify conversations by topic in their history
2. **Improved Organization**: Conversation list becomes more scannable and meaningful
3. **Automatic**: No user action required - works seamlessly on first message
4. **Flexible**: Users can still manually update titles via the PATCH endpoint
5. **Safe**: Non-blocking implementation - failures don't affect chat functionality

## API Usage

### Automatic (No action needed)
Just send your first message to any conversation, and the title will be automatically updated:

```bash
POST /api/chat
{
  "conversationId": "6901159aad868d9cc890e607",
  "text": "What are the key principles of quantum computing?"
}
```

Result: Conversation title changes from "General Assistant" to "What are the key principles of quantum computing?"

### Manual Update
To manually change a conversation title:

```bash
PATCH /api/conversations/6901159aad868d9cc890e607
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "title": "Quantum Computing Discussion"
}
```

## Testing

To test the feature:

1. **Create a new conversation:**
```bash
POST /api/conversations
{
  "agentKey": "general"
}
```

2. **Send first message:**
```bash
POST /api/chat
{
  "conversationId": "<conversation_id>",
  "text": "Tell me about artificial intelligence"
}
```

3. **Check conversation list:**
```bash
GET /api/conversations?limit=20&offset=0
```

Expected: The conversation title should now be "Tell me about artificial intelligence" instead of "General Assistant"

## Backward Compatibility

- ✅ Existing conversations keep their current titles
- ✅ Only new messages trigger title updates (and only if title is still default)
- ✅ Manual title updates via PATCH are always respected
- ✅ No database migrations required

## Error Handling

- Title generation errors fallback to "New Conversation"
- Title update failures are logged but don't affect message sending
- Type-safe with proper null/undefined handling
- Validation ensures titles are 1-100 characters for manual updates

## Future Enhancements (Optional)

- Add AI-powered title summarization for very long messages
- Support for title regeneration on user request
- Multi-language title generation support
- Title suggestions based on conversation content analysis
