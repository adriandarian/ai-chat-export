/**
 * Code block processing and rebuilding for exports
 */

import { highlightCode, KNOWN_LANGUAGES } from './syntaxHighlighting';

/**
 * Detect the programming language from various element attributes and classes
 */
const detectLanguage = (preEl: HTMLElement, codeEl: HTMLElement | null): string => {
  // Check for language in various places
  const classesToCheck = [
    codeEl?.className || '',
    preEl.className || '',
    preEl.closest('[class*="language-"]')?.className || '',
    preEl.closest('[data-language]')?.getAttribute('data-language') || ''
  ].join(' ');
  
  const langMatch = classesToCheck.match(/language-(\w+)|lang-(\w+)|hljs\s+(\w+)/);
  if (langMatch) {
    return langMatch[1] || langMatch[2] || langMatch[3] || '';
  }
  
  // Also check for language label in nearby elements (ChatGPT puts it in a span)
  const codeBlockWrapper = preEl.closest('[class*="code"]') || preEl.parentElement;
  if (codeBlockWrapper) {
    const langSpan = codeBlockWrapper.querySelector('span');
    if (langSpan && langSpan.textContent && langSpan.textContent.length < 20) {
      const potentialLang = langSpan.textContent.toLowerCase().trim();
      if (KNOWN_LANGUAGES.includes(potentialLang)) {
        return potentialLang;
      }
    }
  }
  
  return '';
};

/**
 * Clean up code content by removing toolbar artifacts
 */
const cleanCodeContent = (textContent: string): string => {
  return textContent
    .replace(/^[\s]*Copy code[\s]*/i, '')
    .replace(/^[\s]*Copy[\s]*/i, '')
    .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*Copy code[\s]*/i, '')
    .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*/i, '');
};

/**
 * Create a styled code wrapper with language badge
 */
const createCodeWrapper = (language: string, bgColor: string): HTMLDivElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'exported-code-wrapper';
  wrapper.style.cssText = `
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    margin: 1em 0;
    background-color: ${bgColor};
  `;
  
  // Create subtle language badge in top-right corner
  if (language) {
    const badge = document.createElement('div');
    badge.className = 'exported-code-lang';
    badge.style.cssText = `
      position: absolute;
      top: 8px;
      right: 12px;
      font-size: 11px;
      color: #6b7280;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 500;
      text-transform: lowercase;
      letter-spacing: 0.02em;
      user-select: none;
      pointer-events: none;
    `;
    badge.textContent = language;
    wrapper.appendChild(badge);
  }
  
  return wrapper;
};

/**
 * Create a styled pre/code element structure
 */
const createStyledCodeBlock = (
  textContent: string,
  language: string,
  bgColor: string
): HTMLPreElement => {
  const newPre = document.createElement('pre');
  newPre.className = 'exported-code-block';
  newPre.setAttribute('data-language', language);
  newPre.style.cssText = `
    background-color: ${bgColor};
    color: #d4d4d4;
    padding: 1em;
    padding-top: ${language ? '2em' : '1em'};
    margin: 0;
    overflow-x: auto;
    overflow-y: visible;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-word;
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
  `;
  
  const newCode = document.createElement('code');
  newCode.style.cssText = `
    display: block;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-word;
    overflow: visible;
    font-family: inherit;
  `;
  
  // Apply syntax highlighting
  if (language) {
    newCode.innerHTML = highlightCode(textContent, language);
  } else {
    newCode.textContent = textContent;
  }
  
  newPre.appendChild(newCode);
  return newPre;
};

/**
 * Rebuild code blocks with plain text to bypass all CSS issues
 */
export const rebuildCodeBlocks = (container: HTMLElement): void => {
  // Find all pre elements and rebuild them with just the text content
  container.querySelectorAll('pre').forEach((pre) => {
    const preEl = pre as HTMLElement;
    const codeEl = preEl.querySelector('code');
    
    // Detect the language
    const language = detectLanguage(preEl, codeEl);
    
    // Get code content - try to get just the code, not the toolbar
    let textContent = '';
    
    // First, try to find just the code element (skip toolbar/buttons)
    if (codeEl) {
      textContent = codeEl.textContent || '';
    } else {
      // Clone and remove toolbar elements before getting text
      const clone = preEl.cloneNode(true) as HTMLElement;
      // Remove common toolbar selectors
      clone.querySelectorAll('button, [class*="copy"], [class*="toolbar"], [class*="header"]').forEach(el => el.remove());
      textContent = clone.textContent || '';
    }
    
    // Clean up the text
    textContent = cleanCodeContent(textContent);
    
    // Skip if empty
    if (!textContent.trim()) return;
    
    // Get background color from computed styles
    const computedStyle = window.getComputedStyle(preEl);
    let bgColor = computedStyle.backgroundColor;
    // Default to dark theme if transparent
    if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
      bgColor = '#1e1e1e';
    }
    
    // Create wrapper and code block
    const wrapper = createCodeWrapper(language, bgColor);
    const newPre = createStyledCodeBlock(textContent, language, bgColor);
    wrapper.appendChild(newPre);
    
    // Replace the old pre with the new wrapper
    // Need to find the right element to replace (might be a wrapper div)
    const existingCodeWrapper = preEl.closest('[class*="code-block"], [class*="codeblock"], [class*="highlight"]');
    if (existingCodeWrapper && existingCodeWrapper.parentNode) {
      existingCodeWrapper.parentNode.replaceChild(wrapper, existingCodeWrapper);
    } else if (preEl.parentNode) {
      preEl.parentNode.replaceChild(wrapper, preEl);
    }
  });
  
  // Also fix any divs that might still have overflow issues
  container.querySelectorAll('div:not(.exported-code-wrapper):not(.exported-code-header)').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = 'visible';
    htmlEl.style.overflowX = 'visible';
    htmlEl.style.maxHeight = 'none';
  });
};

/**
 * Legacy function name for compatibility
 */
export const fixCodeBlocks = rebuildCodeBlocks;

