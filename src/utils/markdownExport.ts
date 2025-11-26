/**
 * HTML to Markdown conversion and export
 */

import { SelectedElement } from '../types';

/**
 * Convert HTML node to Markdown string
 */
const processNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim() || '';
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(n => processNode(n)).join('');
  
  switch (tag) {
    case 'h1': return `\n# ${children}\n`;
    case 'h2': return `\n## ${children}\n`;
    case 'h3': return `\n### ${children}\n`;
    case 'h4': return `\n#### ${children}\n`;
    case 'h5': return `\n##### ${children}\n`;
    case 'h6': return `\n###### ${children}\n`;
    case 'p': return `\n${children}\n`;
    case 'br': return '\n';
    case 'hr': return '\n---\n';
    case 'strong':
    case 'b': return `**${children}**`;
    case 'em':
    case 'i': return `*${children}*`;
    case 'code': 
      if (el.parentElement?.tagName.toLowerCase() === 'pre') {
        return children;
      }
      return `\`${children}\``;
    case 'pre': return `\n\`\`\`\n${children}\n\`\`\`\n`;
    case 'blockquote': return `\n> ${children.split('\n').join('\n> ')}\n`;
    case 'ul':
    case 'ol': return `\n${children}`;
    case 'li': 
      const isOrdered = el.parentElement?.tagName.toLowerCase() === 'ol';
      const prefix = isOrdered ? '1.' : '-';
      return `${prefix} ${children}\n`;
    case 'a': 
      const href = el.getAttribute('href');
      return href ? `[${children}](${href})` : children;
    case 'img':
      const src = el.getAttribute('src');
      const alt = el.getAttribute('alt') || 'image';
      return src ? `![${alt}](${src})` : '';
    case 'div':
    case 'span':
    case 'article':
    case 'section':
    case 'main':
      // Check for common role indicators
      const role = el.getAttribute('data-message-author-role') || 
                   el.getAttribute('role') ||
                   el.className?.toLowerCase() || '';
      if (role.includes('user') || role.includes('human')) {
        return `\n---\n\n**User:**\n\n${children}\n`;
      }
      if (role.includes('assistant') || role.includes('ai') || role.includes('bot')) {
        return `\n**Assistant:**\n\n${children}\n`;
      }
      return children;
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
  const header = `# Chat Export\n\nExported on: ${new Date().toLocaleString()}\nSource: ${window.location.href}\n\n---\n\n`;
  
  const content = elements.map(el => {
    try {
      return htmlToMarkdown(el.content);
    } catch (err) {
      console.warn('Error converting to markdown:', err);
      // Fallback: strip HTML tags
      const div = document.createElement('div');
      div.innerHTML = el.content;
      return div.textContent || '';
    }
  }).join('\n\n---\n\n');
  
  return header + content;
};

