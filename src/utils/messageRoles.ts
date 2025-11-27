/**
 * Message role detection utilities
 * 
 * Detects whether a DOM element represents a user or assistant message
 * in various AI chat interfaces (ChatGPT, Claude, etc.)
 */

import { MessageRole } from '../types';

/**
 * Detect if an element represents a user message
 */
export const isUserMessage = (element: Element): boolean => {
  // Check data attribute (ChatGPT uses this)
  const dataRole = element.getAttribute('data-message-author-role');
  if (dataRole === 'user') return true;
  
  // Check class names
  const className = element.className?.toString().toLowerCase() || '';
  if (className.includes('user')) return true;
  
  // Check for nested user message indicator
  if (element.querySelector('[data-message-author-role="user"]')) return true;
  
  // Check if this element is inside a user message container
  if (element.closest('[data-message-author-role="user"]')) return true;
  if (element.classList.contains('user-message')) return true;
  
  return false;
};

/**
 * Detect if an element represents an assistant message
 */
export const isAssistantMessage = (element: Element): boolean => {
  // Check data attribute (ChatGPT uses this)
  const dataRole = element.getAttribute('data-message-author-role');
  if (dataRole === 'assistant') return true;
  
  // Check class names for various patterns
  const className = element.className?.toString().toLowerCase() || '';
  if (className.includes('assistant') || 
      className.includes('agent-turn') || 
      className.includes('bot')) {
    return true;
  }
  
  // Check for nested assistant message indicator
  if (element.querySelector('[data-message-author-role="assistant"]')) return true;
  
  // Check if this element is inside an assistant message container
  if (element.closest('[data-message-author-role="assistant"]')) return true;
  if (element.classList.contains('agent-turn')) return true;
  
  return false;
};

/**
 * Detect the message role from an element
 * Returns undefined if no role can be determined
 */
export const detectMessageRole = (element: Element): MessageRole | undefined => {
  if (isUserMessage(element)) return 'user';
  if (isAssistantMessage(element)) return 'assistant';
  return undefined;
};

/**
 * Try to guess message role from content characteristics
 * Used as a fallback when DOM-based detection fails
 */
export const guessRoleFromContent = (element: Element): MessageRole => {
  const text = element.textContent?.toLowerCase() || '';
  const hasCodeBlocks = element.querySelector('pre') !== null;
  const isLongResponse = text.length > 500;
  
  // Likely assistant if has code blocks or is long
  return (hasCodeBlocks || isLongResponse) ? 'assistant' : 'user';
};

