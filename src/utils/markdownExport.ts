/**
 * HTML to Markdown conversion and export
 */

import { SelectedElement } from '../types';

/**
 * Convert HTML node to Markdown string
 */
const processNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
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
  
  // Process children, preserving spaces between them
  const childNodes = Array.from(el.childNodes);
  const children = childNodes.map(n => processNode(n)).join('');
  
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
        return children;
      }
      return trimmedChildren ? `\`${trimmedChildren}\`` : '';
    case 'pre': {
      // Try to detect language from class or data attribute
      const langClass = el.className?.match(/language-(\w+)/)?.[1] || 
                        el.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || '';
      return `\n\`\`\`${langClass}\n${trimmedChildren}\n\`\`\`\n`;
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
      // Check for common role indicators
      const role = el.getAttribute('data-message-author-role') || 
                   el.getAttribute('role') ||
                   el.className?.toLowerCase() || '';
      // Only add role markers if there's actual content
      if (role.includes('user') || role.includes('human')) {
        return trimmedChildren ? `\n---\n\n**User:**\n\n${trimmedChildren}\n` : '';
      }
      if (role.includes('assistant') || role.includes('ai') || role.includes('bot')) {
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
  
  // Fix spacing around inline formatting markers
  // Pattern: nonspace + asterisks + word (closing marker followed by word) → add space after
  markdown = markdown.replace(/(\S)(\*{1,3})(\w)/g, '$1$2 $3');
  // Pattern: word + asterisks + nonspace (word followed by opening marker) → add space before
  markdown = markdown.replace(/(\w)(\*{1,3})(\S)/g, '$1 $2$3');
  
  // Same for backticks (inline code)
  markdown = markdown.replace(/(\S)(`)(\w)/g, '$1$2 $3');
  markdown = markdown.replace(/(\w)(`)(\S)/g, '$1 $2$3');
  
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

