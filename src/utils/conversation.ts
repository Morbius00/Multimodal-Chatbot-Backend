import { logger } from './logger';

/**
 * Generate a conversation title from the first user message
 * @param messageText The first user message text
 * @param maxLength Maximum length of the title (default: 60)
 * @returns A formatted conversation title
 */
export function generateConversationTitle(messageText: string, maxLength: number = 60): string {
  try {
    // Clean up the text
    let title = messageText.trim();
    
    // Remove extra whitespace and newlines
    title = title.replace(/\s+/g, ' ');
    
    // If the message is too long, truncate it
    if (title.length > maxLength) {
      // Try to break at a word boundary
      const truncated = title.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      
      if (lastSpace > maxLength * 0.6) {
        // If we can find a good break point, use it
        title = truncated.substring(0, lastSpace) + '...';
      } else {
        // Otherwise, just truncate at maxLength
        title = truncated + '...';
      }
    }
    
    // Capitalize first letter if not already
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    return title;
  } catch (error) {
    logger.error({ error, messageText }, 'Failed to generate conversation title');
    return 'New Conversation';
  }
}

/**
 * Check if a conversation needs title update (still has default agent name as title)
 * @param currentTitle The current conversation title
 * @param agentDisplayName The agent's display name
 * @returns true if title should be updated
 */
export function shouldUpdateConversationTitle(currentTitle: string | undefined, agentDisplayName: string): boolean {
  if (!currentTitle) return true;
  
  // Check if title matches common agent display names or is a default/placeholder
  const defaultTitles = [
    'General Assistant',
    'General Companion',
    'Education Assistant',
    'Education Companion',
    'Finance Assistant',
    'Finance Companion',
    'Medical Information Assistant',
    'Medical Information Companion',
    'Medical Assistant',
    'Medical Companion',
    'Technology Assistant',
    'Technology Companion',
    'Legal Information Assistant',
    'Legal Information Companion',
    'Creative Assistant',
    'Creative Companion',
    'Language Assistant',
    'Language Companion',
    'Business Assistant',
    'Business Companion',
    'New Conversation',
    agentDisplayName
  ];
  
  return defaultTitles.includes(currentTitle);
}
