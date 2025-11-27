/**
 * JSON Export - Converts selected chat elements into structured prompt-response pairs
 */

import { SelectedElement } from '../types';

/**
 * Content types that can appear in messages
 */
export interface TextContent {
  type: 'text';
  content: string;
}

export interface CodeBlockContent {
  type: 'code';
  language: string;
  content: string;
}

export interface ListContent {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface ImageContent {
  type: 'image';
  src: string;
  alt: string;
}

export interface LinkContent {
  type: 'link';
  text: string;
  url: string;
}

export type MessageContent = TextContent | CodeBlockContent | ListContent | ImageContent | LinkContent;

/**
 * A single message in the conversation
 */
export interface MessageData {
  role: 'user' | 'assistant';
  content: MessageContent[];
  timestamp?: string;
}

/**
 * A prompt-response exchange
 */
export interface Exchange {
  prompt: {
    content: MessageContent[];
    timestamp?: string;
  };
  response: {
    content: MessageContent[];
    timestamp?: string;
  };
  metadata?: {
    index: number;
  };
}

/**
 * The full export structure
 */
export interface ChatExport {
  exportedAt: string;
  source: string;
  exchanges: Exchange[];
  metadata?: {
    totalExchanges: number;
    exportVersion: string;
  };
}

/**
 * Known programming languages for code detection
 */
const KNOWN_LANGUAGES = [
  'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java', 'c', 'cpp', 
  'csharp', 'cs', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
  'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'markdown', 'md',
  'sql', 'bash', 'sh', 'shell', 'zsh', 'powershell', 'dockerfile', 'makefile',
  'plaintext', 'text', 'diff', 'graphql', 'toml', 'ini', 'env', 'jsx', 'tsx'
];

/**
 * Detect language from element classes and attributes
 */
const detectLanguage = (element: Element): string => {
  const className = element.className?.toString() || '';
  const langMatch = className.match(/language-(\w+)|lang-(\w+)|hljs\s+(\w+)/);
  if (langMatch) {
    return langMatch[1] || langMatch[2] || langMatch[3] || '';
  }
  
  const dataLang = element.getAttribute('data-language');
  if (dataLang) return dataLang;
  
  // Check for language in nearby text (ChatGPT style)
  const parent = element.parentElement;
  if (parent) {
    const langSpan = parent.querySelector('span');
    if (langSpan && langSpan.textContent) {
      const potentialLang = langSpan.textContent.toLowerCase().trim();
      if (KNOWN_LANGUAGES.includes(potentialLang)) {
        return potentialLang;
      }
    }
  }
  
  return 'plaintext';
};

/**
 * Clean code content by removing toolbar artifacts
 */
const cleanCodeContent = (text: string): string => {
  return text
    .replace(/^[\s]*Copy code[\s]*/i, '')
    .replace(/^[\s]*Copy[\s]*/i, '')
    .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*Copy code[\s]*/i, '')
    .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*$/im, '')
    .trim();
};

/**
 * Detect if element is a user message container
 */
const isUserMessage = (element: Element): boolean => {
  const dataRole = element.getAttribute('data-message-author-role');
  if (dataRole === 'user') return true;
  
  const className = element.className?.toString().toLowerCase() || '';
  if (className.includes('user')) return true;
  
  // Check for ChatGPT's user message indicator
  if (element.querySelector('[data-message-author-role="user"]')) return true;
  
  return false;
};

/**
 * Detect if element is an assistant message container
 */
const isAssistantMessage = (element: Element): boolean => {
  const dataRole = element.getAttribute('data-message-author-role');
  if (dataRole === 'assistant') return true;
  
  const className = element.className?.toString().toLowerCase() || '';
  if (className.includes('assistant') || className.includes('agent-turn') || className.includes('bot')) return true;
  
  // Check for ChatGPT's assistant message indicator
  if (element.querySelector('[data-message-author-role="assistant"]')) return true;
  
  return false;
};

/**
 * Extract text content from an element, preserving some structure
 */
const extractText = (element: Element): string => {
  let text = '';
  
  element.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      
      // Skip certain elements
      if (tag === 'pre' || tag === 'code') return;
      if (tag === 'button') return;
      if (el.classList.contains('copy') || el.getAttribute('data-state')) return;
      
      // Add line breaks for block elements
      if (['p', 'div', 'br', 'li'].includes(tag)) {
        text += '\n';
      }
      
      text += extractText(el);
      
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        text += '\n';
      }
    }
  });
  
  return text;
};

/**
 * Parse content from an element into structured MessageContent array
 */
const parseMessageContent = (element: Element): MessageContent[] => {
  const contents: MessageContent[] = [];
  
  const processElement = (el: Element) => {
    const tagName = el.tagName?.toLowerCase();
    
    // Handle code blocks
    if (tagName === 'pre') {
      const codeEl = el.querySelector('code');
      const language = codeEl ? detectLanguage(codeEl) : detectLanguage(el);
      
      // Clone and clean the element
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('button, [class*="copy"], [class*="toolbar"], [class*="header"]').forEach(btn => btn.remove());
      
      const codeContent = cleanCodeContent(clone.textContent || '');
      
      if (codeContent.trim()) {
        contents.push({
          type: 'code',
          language,
          content: codeContent
        });
      }
      return;
    }
    
    // Handle images
    if (tagName === 'img') {
      const img = el as HTMLImageElement;
      let src = img.src;
      
      // Skip tiny images (likely icons)
      if (img.width < 20 || img.height < 20) return;
      
      contents.push({
        type: 'image',
        src,
        alt: img.alt || ''
      });
      return;
    }
    
    // Handle links
    if (tagName === 'a') {
      const href = el.getAttribute('href');
      const text = el.textContent?.trim() || '';
      if (href && text && !href.startsWith('javascript:')) {
        contents.push({
          type: 'link',
          text,
          url: href
        });
        return;
      }
    }
    
    // Handle lists
    if (tagName === 'ul' || tagName === 'ol') {
      const items: string[] = [];
      el.querySelectorAll(':scope > li').forEach(li => {
        const text = li.textContent?.trim();
        if (text) items.push(text);
      });
      
      if (items.length > 0) {
        contents.push({
          type: 'list',
          ordered: tagName === 'ol',
          items
        });
      }
      return;
    }
    
    // Handle paragraphs and text containers
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'].includes(tagName)) {
      // Check if this contains only text (no significant children)
      const hasComplexContent = el.querySelector('pre, img, ul, ol, table');
      
      if (!hasComplexContent) {
        const text = el.textContent?.trim();
        if (text) {
          // Add heading indicator if it's a heading
          const prefix = tagName.startsWith('h') ? `${'#'.repeat(parseInt(tagName[1]))} ` : '';
          contents.push({
            type: 'text',
            content: prefix + text
          });
        }
        return;
      }
    }
    
    // Recursively process children for containers
    if (['div', 'article', 'section', 'main', 'blockquote'].includes(tagName)) {
      el.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processElement(child as Element);
        } else if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text && text.length > 1) {
            contents.push({
              type: 'text',
              content: text
            });
          }
        }
      });
    }
  };
  
  // Process the element
  processElement(element);
  
  // If we didn't find any structured content, fall back to plain text
  if (contents.length === 0) {
    const text = element.textContent?.trim();
    if (text) {
      contents.push({
        type: 'text',
        content: text
      });
    }
  }
  
  // Merge consecutive text blocks
  const merged: MessageContent[] = [];
  for (const content of contents) {
    if (content.type === 'text' && merged.length > 0 && merged[merged.length - 1].type === 'text') {
      (merged[merged.length - 1] as TextContent).content += '\n' + content.content;
    } else {
      merged.push(content);
    }
  }
  
  // Clean up text content
  return merged.map(item => {
    if (item.type === 'text') {
      return {
        ...item,
        content: item.content
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      };
    }
    return item;
  }).filter(item => {
    if (item.type === 'text') return item.content.length > 0;
    if (item.type === 'code') return item.content.length > 0;
    return true;
  });
};

/**
 * Find all message containers within an element
 */
const findMessageContainers = (element: Element): { role: 'user' | 'assistant'; element: Element }[] => {
  const messages: { role: 'user' | 'assistant'; element: Element }[] = [];
  
  // Common selectors for message containers
  const messageSelectors = [
    '[data-message-author-role]',
    '[class*="conversation-turn"]',
    '[class*="ConversationItem"]',
    '[class*="message-"]',
    '[class*="chat-message"]',
    '[class*="Message_"]',
    '[role="article"]',
    'article[data-scroll-anchor]',
    '[class*="group/conversation-turn"]',
    '.message',
    '.chat-turn',
  ];
  
  // Try to find message containers
  for (const selector of messageSelectors) {
    try {
      const containers = element.querySelectorAll(selector);
      if (containers.length > 0) {
        containers.forEach(container => {
          if (isUserMessage(container)) {
            messages.push({ role: 'user', element: container });
          } else if (isAssistantMessage(container)) {
            messages.push({ role: 'assistant', element: container });
          }
        });
        
        if (messages.length > 0) break;
      }
    } catch (e) {
      // Invalid selector, continue
    }
  }
  
  // If no containers found, check the element itself
  if (messages.length === 0) {
    if (isUserMessage(element)) {
      messages.push({ role: 'user', element });
    } else if (isAssistantMessage(element)) {
      messages.push({ role: 'assistant', element });
    }
  }
  
  return messages;
};

/**
 * Parse HTML content into messages
 */
const parseHtmlToMessages = (html: string): MessageData[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const messages: MessageData[] = [];
  
  // Find all message containers
  const containers = findMessageContainers(doc.body);
  
  if (containers.length > 0) {
    containers.forEach(({ role, element }) => {
      const content = parseMessageContent(element);
      if (content.length > 0) {
        messages.push({ role, content });
      }
    });
  } else {
    // Fallback: treat entire content as a single message
    // Try to detect role from content
    const content = parseMessageContent(doc.body);
    if (content.length > 0) {
      // Guess role based on content characteristics
      const text = doc.body.textContent?.toLowerCase() || '';
      const hasCodeBlocks = doc.body.querySelector('pre') !== null;
      const isLongResponse = text.length > 500;
      
      // Likely assistant if has code blocks or is long
      const role = (hasCodeBlocks || isLongResponse) ? 'assistant' : 'user';
      messages.push({ role, content });
    }
  }
  
  return messages;
};

/**
 * Group messages into prompt-response exchanges
 */
const groupIntoExchanges = (messages: MessageData[]): Exchange[] => {
  const exchanges: Exchange[] = [];
  let currentPrompt: MessageData | null = null;
  let exchangeIndex = 0;
  
  for (const message of messages) {
    if (message.role === 'user') {
      // If we have a pending prompt without response, add it with empty response
      if (currentPrompt) {
        exchanges.push({
          prompt: {
            content: currentPrompt.content,
            timestamp: currentPrompt.timestamp
          },
          response: {
            content: []
          },
          metadata: { index: exchangeIndex++ }
        });
      }
      currentPrompt = message;
    } else if (message.role === 'assistant') {
      if (currentPrompt) {
        // Complete the exchange
        exchanges.push({
          prompt: {
            content: currentPrompt.content,
            timestamp: currentPrompt.timestamp
          },
          response: {
            content: message.content,
            timestamp: message.timestamp
          },
          metadata: { index: exchangeIndex++ }
        });
        currentPrompt = null;
      } else {
        // Assistant message without prompt - add with empty prompt
        exchanges.push({
          prompt: {
            content: []
          },
          response: {
            content: message.content,
            timestamp: message.timestamp
          },
          metadata: { index: exchangeIndex++ }
        });
      }
    }
  }
  
  // Handle trailing prompt without response
  if (currentPrompt) {
    exchanges.push({
      prompt: {
        content: currentPrompt.content,
        timestamp: currentPrompt.timestamp
      },
      response: {
        content: []
      },
      metadata: { index: exchangeIndex++ }
    });
  }
  
  return exchanges;
};

/**
 * Generate JSON export from selected elements
 */
export const generateExportJSON = (elements: SelectedElement[]): string => {
  // Parse all selected elements into messages
  const allMessages: MessageData[] = [];
  
  elements.forEach(el => {
    const messages = parseHtmlToMessages(el.content);
    allMessages.push(...messages);
  });
  
  // Group into exchanges
  const exchanges = groupIntoExchanges(allMessages);
  
  // Build the export structure
  const exportData: ChatExport = {
    exportedAt: new Date().toISOString(),
    source: typeof window !== 'undefined' ? window.location.href : '',
    exchanges,
    metadata: {
      totalExchanges: exchanges.length,
      exportVersion: '1.0.0'
    }
  };
  
  return JSON.stringify(exportData, null, 2);
};

/**
 * Generate a simplified JSON export (just the exchanges array)
 */
export const generateSimpleExportJSON = (elements: SelectedElement[]): string => {
  // Parse all selected elements into messages
  const allMessages: MessageData[] = [];
  
  elements.forEach(el => {
    const messages = parseHtmlToMessages(el.content);
    allMessages.push(...messages);
  });
  
  // Group into exchanges
  const exchanges = groupIntoExchanges(allMessages);
  
  // Return just the array
  return JSON.stringify(exchanges, null, 2);
};

