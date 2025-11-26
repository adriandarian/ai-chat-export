/**
 * PDF Content Parser - Extracts structured content from HTML for PDF rendering
 */

export type ContentBlockType = 
  | 'paragraph'
  | 'heading'
  | 'code-block'
  | 'inline-code'
  | 'list'
  | 'list-item'
  | 'image'
  | 'link'
  | 'blockquote'
  | 'horizontal-rule'
  | 'user-message'
  | 'assistant-message'
  | 'raw-html';

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
  color?: string;
}

export interface ContentBlock {
  type: ContentBlockType;
  // For text content
  runs?: TextRun[];
  // For headings
  level?: number; // 1-6
  // For code blocks
  code?: string;
  language?: string;
  backgroundColor?: string;
  // For lists
  ordered?: boolean;
  items?: ContentBlock[];
  // For images
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  // For raw HTML (fallback)
  html?: string;
  element?: HTMLElement;
  // Message context
  role?: 'user' | 'assistant';
  // Computed styles for better rendering
  styles?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontFamily?: string;
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
  'plaintext', 'text', 'diff', 'graphql', 'toml', 'ini', 'env'
];

/**
 * Detect language from element classes and attributes
 */
const detectLanguage = (element: HTMLElement): string => {
  const checkClasses = (el: Element | null): string => {
    if (!el) return '';
    const className = el.className || '';
    const langMatch = className.match(/language-(\w+)|lang-(\w+)|hljs\s+(\w+)/);
    if (langMatch) {
      return langMatch[1] || langMatch[2] || langMatch[3] || '';
    }
    const dataLang = el.getAttribute('data-language');
    if (dataLang) return dataLang;
    return '';
  };

  // Check the element itself
  let lang = checkClasses(element);
  if (lang) return lang;

  // Check code child
  const codeEl = element.querySelector('code');
  if (codeEl) {
    lang = checkClasses(codeEl);
    if (lang) return lang;
  }

  // Check parent wrapper
  const wrapper = element.closest('[class*="code"], [data-language]');
  if (wrapper) {
    lang = checkClasses(wrapper);
    if (lang) return lang;
  }

  // Check for language label in nearby span (ChatGPT style)
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

  return '';
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
 * Extract text runs with formatting from an element
 */
const extractTextRuns = (element: Element, parentStyles?: { color?: string }): TextRun[] => {
  const runs: TextRun[] = [];
  
  const processNode = (node: Node, inherited: { bold?: boolean; italic?: boolean; code?: boolean; link?: string; color?: string } = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        runs.push({
          text,
          ...inherited,
          color: inherited.color || parentStyles?.color
        });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    const newInherited = { ...inherited };

    // Detect formatting
    if (tagName === 'strong' || tagName === 'b') {
      newInherited.bold = true;
    }
    if (tagName === 'em' || tagName === 'i') {
      newInherited.italic = true;
    }
    if (tagName === 'code' && !el.closest('pre')) {
      newInherited.code = true;
    }
    if (tagName === 'a') {
      newInherited.link = el.getAttribute('href') || undefined;
    }

    // Get computed color if different from parent
    try {
      const computed = window.getComputedStyle(el);
      if (computed.color && computed.color !== 'rgba(0, 0, 0, 0)') {
        newInherited.color = computed.color;
      }
    } catch (e) {
      // Ignore
    }

    // Process children
    el.childNodes.forEach(child => processNode(child, newInherited));
  };

  processNode(element);
  return runs;
};

/**
 * Get computed background color from element
 */
const getBackgroundColor = (element: HTMLElement): string => {
  try {
    const computed = window.getComputedStyle(element);
    const bg = computed.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
  } catch (e) {
    // Ignore
  }
  return '#1e1e1e'; // Default dark code block background
};

/**
 * Get computed text color from element
 */
const getTextColor = (element: HTMLElement): string => {
  try {
    const computed = window.getComputedStyle(element);
    return computed.color || '#ffffff';
  } catch (e) {
    return '#ffffff';
  }
};

/**
 * Parse a code block element
 */
const parseCodeBlock = (pre: HTMLElement): ContentBlock => {
  const codeEl = pre.querySelector('code');
  const language = detectLanguage(pre);
  
  // Get code content
  let codeContent = '';
  if (codeEl) {
    codeContent = codeEl.textContent || '';
  } else {
    // Clone and remove toolbar elements
    const clone = pre.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, [class*="copy"], [class*="toolbar"], [class*="header"]').forEach(el => el.remove());
    codeContent = clone.textContent || '';
  }
  
  codeContent = cleanCodeContent(codeContent);
  
  return {
    type: 'code-block',
    code: codeContent,
    language,
    backgroundColor: getBackgroundColor(pre),
    element: pre
  };
};

/**
 * Parse a list element
 */
const parseList = (list: HTMLElement): ContentBlock => {
  const isOrdered = list.tagName.toLowerCase() === 'ol';
  const items: ContentBlock[] = [];

  list.querySelectorAll(':scope > li').forEach(li => {
    // Check for nested lists
    const nestedList = li.querySelector('ol, ul');
    if (nestedList) {
      // Process text before nested list
      const textNodes = Array.from(li.childNodes).filter(n => 
        n.nodeType === Node.TEXT_NODE || 
        (n.nodeType === Node.ELEMENT_NODE && !['OL', 'UL'].includes((n as Element).tagName))
      );
      
      if (textNodes.length > 0) {
        const tempDiv = document.createElement('div');
        textNodes.forEach(n => tempDiv.appendChild(n.cloneNode(true)));
        items.push({
          type: 'list-item',
          runs: extractTextRuns(tempDiv)
        });
      }
      
      // Add nested list
      items.push(parseList(nestedList as HTMLElement));
    } else {
      items.push({
        type: 'list-item',
        runs: extractTextRuns(li as HTMLElement)
      });
    }
  });

  return {
    type: 'list',
    ordered: isOrdered,
    items
  };
};

/**
 * Parse an image element
 */
const parseImage = (img: HTMLImageElement): ContentBlock => {
  let src = img.src;
  
  // Convert relative URLs to absolute
  if (src && !src.startsWith('http') && !src.startsWith('data:')) {
    try {
      src = new URL(src, window.location.href).href;
    } catch (e) {
      // Keep original
    }
  }

  return {
    type: 'image',
    src,
    alt: img.alt || '',
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height
  };
};

/**
 * Detect if element is a user message bubble
 */
const isUserMessage = (element: HTMLElement): boolean => {
  return element.getAttribute('data-message-author-role') === 'user' ||
    element.classList.contains('user-message') ||
    element.closest('[data-message-author-role="user"]') !== null;
};

/**
 * Detect if element is an assistant message
 */
const isAssistantMessage = (element: HTMLElement): boolean => {
  return element.getAttribute('data-message-author-role') === 'assistant' ||
    element.classList.contains('agent-turn') ||
    element.closest('[data-message-author-role="assistant"]') !== null;
};

/**
 * Parse a single HTML element into content blocks
 */
const parseElement = (element: HTMLElement): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  const tagName = element.tagName.toLowerCase();

  // Skip hidden elements
  try {
    const computed = window.getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') {
      return blocks;
    }
  } catch (e) {
    // Continue processing
  }

  // Handle code blocks
  if (tagName === 'pre' || element.classList.contains('exported-code-wrapper')) {
    const pre = tagName === 'pre' ? element : element.querySelector('pre');
    if (pre) {
      blocks.push(parseCodeBlock(pre as HTMLElement));
    }
    return blocks;
  }

  // Handle headings
  if (/^h[1-6]$/.test(tagName)) {
    const level = parseInt(tagName[1]);
    blocks.push({
      type: 'heading',
      level,
      runs: extractTextRuns(element)
    });
    return blocks;
  }

  // Handle paragraphs
  if (tagName === 'p') {
    const runs = extractTextRuns(element);
    if (runs.length > 0 && runs.some(r => r.text.trim())) {
      blocks.push({
        type: 'paragraph',
        runs,
        styles: {
          color: getTextColor(element)
        }
      });
    }
    return blocks;
  }

  // Handle lists
  if (tagName === 'ol' || tagName === 'ul') {
    blocks.push(parseList(element));
    return blocks;
  }

  // Handle images
  if (tagName === 'img') {
    blocks.push(parseImage(element as HTMLImageElement));
    return blocks;
  }

  // Handle blockquotes
  if (tagName === 'blockquote') {
    blocks.push({
      type: 'blockquote',
      runs: extractTextRuns(element)
    });
    return blocks;
  }

  // Handle horizontal rules
  if (tagName === 'hr') {
    blocks.push({ type: 'horizontal-rule' });
    return blocks;
  }

  // Handle divs and other containers - process children
  if (tagName === 'div' || tagName === 'article' || tagName === 'section' || tagName === 'span') {
    // Check if this is a message container
    const role = isUserMessage(element) ? 'user' : isAssistantMessage(element) ? 'assistant' : undefined;
    
    // Check for markdown content container
    const markdownContainer = element.querySelector('.markdown, [class*="markdown"]');
    const contentContainer = markdownContainer || element;

    // Process meaningful children
    const processedChildren: ContentBlock[] = [];
    contentContainer.childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childBlocks = parseElement(child as HTMLElement);
        processedChildren.push(...childBlocks);
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) {
          processedChildren.push({
            type: 'paragraph',
            runs: [{ text }]
          });
        }
      }
    });

    // If we detected a message role, wrap the content
    if (role && processedChildren.length > 0) {
      // For user messages, try to get bubble background color
      if (role === 'user') {
        const bubble = element.querySelector('.user-message-bubble-color, [class*="user-message"]') as HTMLElement;
        const bgColor = bubble ? getBackgroundColor(bubble) : undefined;
        const textColor = bubble ? getTextColor(bubble) : undefined;
        
        blocks.push({
          type: 'user-message',
          role: 'user',
          items: processedChildren,
          styles: {
            backgroundColor: bgColor,
            color: textColor
          }
        });
      } else {
        blocks.push({
          type: 'assistant-message',
          role: 'assistant',
          items: processedChildren
        });
      }
      return blocks;
    }

    return processedChildren;
  }

  // Fallback: extract text if there's meaningful content
  const text = element.textContent?.trim();
  if (text && text.length > 0 && text.length < 10000) {
    blocks.push({
      type: 'paragraph',
      runs: extractTextRuns(element)
    });
  }

  return blocks;
};

/**
 * Main parser function - converts HTML content to structured content blocks
 */
export const parseHTMLToContentBlocks = (html: string): ContentBlock[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: ContentBlock[] = [];

  // Process body children
  doc.body.childNodes.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childBlocks = parseElement(child as HTMLElement);
      blocks.push(...childBlocks);
    }
  });

  return blocks;
};

/**
 * Parse selected elements into content blocks
 */
export const parseSelectedElements = (elements: { content: string }[]): ContentBlock[] => {
  const allBlocks: ContentBlock[] = [];

  elements.forEach(el => {
    const blocks = parseHTMLToContentBlocks(el.content);
    allBlocks.push(...blocks);
  });

  return allBlocks;
};

/**
 * Flatten nested message blocks for easier processing
 */
export const flattenContentBlocks = (blocks: ContentBlock[]): ContentBlock[] => {
  const flattened: ContentBlock[] = [];

  const processBlock = (block: ContentBlock) => {
    if (block.type === 'user-message' || block.type === 'assistant-message') {
      // Add a message marker
      flattened.push({
        type: block.type,
        role: block.role,
        styles: block.styles,
        runs: [] // Empty - just a marker
      });
      // Then add the nested content
      if (block.items) {
        block.items.forEach(processBlock);
      }
    } else {
      flattened.push(block);
    }
  };

  blocks.forEach(processBlock);
  return flattened;
};

