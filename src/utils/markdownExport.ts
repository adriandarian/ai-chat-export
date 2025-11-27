/**
 * HTML to Markdown conversion and export
 */

import { SelectedElement } from '../types';

/**
 * Convert HTML node to Markdown string
 */
const processNode = (node: Node, preserveWhitespace = false): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (preserveWhitespace) {
      return text;
    }
    // Normalize whitespace: collapse multiple spaces/newlines to single space
    // but preserve leading/trailing single spaces for inline context
    const normalized = text.replace(/\s+/g, ' ');
    return normalized;
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  
  // Skip UI elements commonly found in code block wrappers
  if (tag === 'button' || 
      el.getAttribute('role') === 'button' ||
      el.className?.includes('copy') ||
      el.className?.includes('toolbar')) {
    return '';
  }
  
  // Process children, preserving spaces between them
  const childNodes = Array.from(el.childNodes);
  const children = childNodes.map(n => processNode(n, preserveWhitespace)).join('');
  
  // Trim children for block elements, keep for inline
  const trimmedChildren = children.trim();
  
  switch (tag) {
    case 'h1': return `\n# ${trimmedChildren}\n`;
    case 'h2': return `\n## ${trimmedChildren}\n`;
    case 'h3': return `\n### ${trimmedChildren}\n`;
    case 'h4': return `\n#### ${trimmedChildren}\n`;
    case 'h5': return `\n##### ${trimmedChildren}\n`;
    case 'h6': return `\n###### ${trimmedChildren}\n`;
    case 'p': return `\n${trimmedChildren}\n`;
    case 'br': return '\n';
    case 'hr': return '\n---\n';
    case 'strong':
    case 'b': return trimmedChildren ? `**${trimmedChildren}**` : '';
    case 'em':
    case 'i': return trimmedChildren ? `*${trimmedChildren}*` : '';
    case 'code': 
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        // Inside pre: return raw text content to preserve formatting
        return el.textContent || '';
      }
      return trimmedChildren ? `\`${trimmedChildren}\`` : '';
    case 'pre': {
      // Try to detect language from class or data attribute
      const codeEl = el.querySelector('code');
      const langClass = el.className?.match(/language-(\w+)/)?.[1] || 
                        codeEl?.className?.match(/language-(\w+)/)?.[1] || '';
      
      // Get code content directly from the code element if present, otherwise from pre
      // This avoids picking up UI elements like "Copy code" buttons
      const codeContent = codeEl ? (codeEl.textContent || '') : (el.textContent || '');
      const cleanedCode = codeContent.trim();
      
      return cleanedCode ? `\n\`\`\`${langClass}\n${cleanedCode}\n\`\`\`\n` : '';
    }
    case 'blockquote': return `\n> ${trimmedChildren.split('\n').join('\n> ')}\n`;
    case 'ul':
    case 'ol': {
      // Process list items and filter out empty ones
      const listItems = Array.from(el.children)
        .map(child => {
          const itemContent = processNode(child).trim();
          if (!itemContent) return '';
          const isOrdered = tag === 'ol';
          const prefix = isOrdered ? '1.' : '-';
          return `${prefix} ${itemContent}`;
        })
        .filter(item => item.length > 0);
      return listItems.length > 0 ? `\n${listItems.join('\n')}\n` : '';
    }
    case 'li': {
      // Just return children - parent list handles formatting
      return trimmedChildren;
    }
    case 'a': {
      const href = el.getAttribute('href');
      return href ? `[${trimmedChildren}](${href})` : trimmedChildren;
    }
    case 'img': {
      const src = el.getAttribute('src');
      const alt = el.getAttribute('alt') || 'image';
      return src ? `![${alt}](${src})` : '';
    }
    case 'div':
    case 'span':
    case 'article':
    case 'section':
    case 'main': {
      // Only check specific data attributes for role detection (not className)
      // className matching is too broad and can match wrapper elements
      const dataRole = el.getAttribute('data-message-author-role')?.toLowerCase() || '';
      
      // Only add role markers if there's actual content and it's a direct role attribute
      if (dataRole === 'user' || dataRole === 'human') {
        return trimmedChildren ? `\n---\n\n**User:**\n\n${trimmedChildren}\n` : '';
      }
      if (dataRole === 'assistant' || dataRole === 'ai' || dataRole === 'bot') {
        return trimmedChildren ? `\n**Assistant:**\n\n${trimmedChildren}\n` : '';
      }
      return children;
    }
    default:
      return children;
  }
};

/**
 * Convert HTML string to Markdown
 */
export const htmlToMarkdown = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let markdown = processNode(doc.body);
  
  // Clean up excessive newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  markdown = markdown.trim();
  
  return markdown;
};

/**
 * Generate Markdown export from selected elements
 */
export const generateExportMarkdown = (elements: SelectedElement[]): string => {
  // Convert each element and filter out empty results
  const contents = elements.map(el => {
    try {
      return htmlToMarkdown(el.content);
    } catch (err) {
      console.warn('Error converting to markdown:', err);
      // Fallback: strip HTML tags
      const div = document.createElement('div');
      div.innerHTML = el.content;
      return div.textContent || '';
    }
  }).filter(content => content.trim().length > 0);
  
  if (contents.length === 0) {
    return '';
  }
  
  // Join content with separators
  const content = contents.join('\n\n---\n\n');
  
  // Simple header with just metadata, no extra dividers
  const header = `# Chat Export

**Exported:** ${new Date().toLocaleString()}  
**Source:** ${window.location.href}

---

`;
  
  return header + content;
};

