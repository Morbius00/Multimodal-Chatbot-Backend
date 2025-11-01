# Conversation Context Fix

## Problem
The AI agents were not maintaining context of previous messages in a conversation. When users asked follow-up questions like "tell me more about it", the model had no idea what was being discussed because it only received the current message without any conversation history.

## Root Cause
The issue was in `/src/services/orchestrator.ts` in the `processChatRequest` method. When building the messages array to send to the LLM, it was only including:
1. A system prompt
2. The current user message

It was **not** retrieving or including any previous messages from the conversation, causing the AI to lose all context between turns.

## Solution

### 1. Retrieve Conversation History (`orchestrator.ts`)
Modified the orchestrator to:
- Query the database for previous messages in the conversation
- Sort them chronologically (oldest first)
- Limit to the last 20 messages to avoid token overflow
- Include them in the messages array sent to the LLM

```typescript
// Retrieve previous messages from the conversation to maintain context
const Message = (await import('../db/models')).Message;
const previousMessages = await Message.find({ 
  conversationId: request.conversationId 
})
  .sort({ createdAt: 1 }) // Sort by creation time (oldest first)
  .limit(20) // Limit to last 20 messages to avoid token overflow
  .lean();

// Add previous messages to maintain context
for (const msg of previousMessages) {
  if (msg.role === 'user' || msg.role === 'assistant') {
    messages.push({
      role: msg.role,
      content: msg.text || ''
    });
  }
}
```

### 2. Fix System Message Handling (`llm.google.ts`)
The Google Gemini API doesn't support a separate 'system' role in the conversation history. Modified the message conversion to:
- Extract the system message from the messages array
- Prepend it to the first user message
- This ensures the system instructions are included while maintaining proper Gemini API format

```typescript
private convertMessagesToGeminiFormat(messages: ChatMessage[]): Content[] {
  const geminiContents: Content[] = [];
  let systemPrompt = '';

  // Extract system message and prepend it to the first user message
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
      continue;
    }

    const parts: Part[] = [];
    
    // If this is the first user message and we have a system prompt, prepend it
    if (msg.role === 'user' && geminiContents.length === 0 && systemPrompt) {
      parts.push({ text: `${systemPrompt}\n\nUser: ${msg.content}` });
    } else {
      parts.push({ text: msg.content });
    }
    
    // ... rest of the code
  }
}
```

## Benefits
1. **Context Preservation**: The AI now has access to the full conversation history
2. **Better Follow-ups**: Users can ask follow-up questions and the AI will understand the context
3. **Token Management**: Limited to 20 messages to prevent excessive token usage
4. **Proper API Format**: Messages are now correctly formatted for the Gemini API

## Testing
After this fix, you should be able to:
1. Start a conversation: "Tell me about machine learning"
2. Get a response from the AI
3. Ask a follow-up: "Can you give me more details about that?"
4. The AI should now understand "that" refers to machine learning from the previous message

## Files Modified
- `/src/services/orchestrator.ts` - Added conversation history retrieval
- `/src/services/llm.google.ts` - Fixed system message handling for Gemini API

## Notes
- The limit of 20 messages can be adjusted based on your needs and token budget
- Only 'user' and 'assistant' roles are included in the history (system and tool messages are handled separately)
- Messages are sorted chronologically to maintain proper conversation flow
