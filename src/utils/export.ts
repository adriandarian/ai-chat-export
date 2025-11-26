import { SelectedElement } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const getPageStyles = () => {
  const styles: string[] = [];
  // Get external stylesheets
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    styles.push(link.outerHTML);
  });
  // Get inline styles
  document.querySelectorAll('style').forEach((style) => {
    styles.push(style.outerHTML);
  });
  return styles.join('\n');
};

// Simple syntax highlighting for common languages
const highlightCode = (code: string, language: string): string => {
  // Escape HTML first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const lang = language.toLowerCase();
  
  // JSON highlighting - match ChatGPT's color scheme
  if (lang === 'json') {
    // Use a single regex to handle all strings, determining key vs value by context
    escaped = escaped.replace(/"([^"\\]|\\.)*"/g, (match, _, offset, string) => {
      // Check if this string is followed by a colon (making it a key)
      const afterMatch = string.slice(offset + match.length);
      const isKey = /^\s*:/.test(afterMatch);
      if (isKey) {
        // Key - pink/magenta like ChatGPT
        return `<span style="color: #f472b6;">${match}</span>`;
      } else {
        // Value - green/teal like ChatGPT
        return `<span style="color: #4ade80;">${match}</span>`;
      }
    });
    // Numbers
    escaped = escaped.replace(/\b(-?\d+\.?\d*)\b/g, '<span style="color: #b5cea8;">$1</span>');
    // Booleans and null
    escaped = escaped.replace(/\b(true|false|null)\b/g, '<span style="color: #569cd6;">$1</span>');
  }
  // JavaScript/TypeScript highlighting
  // IMPORTANT: Order matters! Strings first, then keywords/numbers, then comments last
  // This prevents the string regex from matching quotes inside our span attributes
  else if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    // First, mark comments with a placeholder to protect them
    const commentPlaceholders: string[] = [];
    escaped = escaped.replace(/(\/\/.*$)/gm, (match) => {
      commentPlaceholders.push(match);
      return `__COMMENT_${commentPlaceholders.length - 1}__`;
    });
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, (match) => {
      commentPlaceholders.push(match);
      return `__COMMENT_${commentPlaceholders.length - 1}__`;
    });
    
    // Now apply other highlighting safely
    escaped = escaped
      // Strings
      .replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/g, '<span style="color: #ce9178;">$1</span>')
      // Keywords
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g, '<span style="color: #569cd6;">$1</span>')
      // Numbers (but not inside words)
      .replace(/(?<![a-zA-Z_])\b(\d+\.?\d*)\b/g, '<span style="color: #b5cea8;">$1</span>');
    
    // Restore comments with highlighting
    escaped = escaped.replace(/__COMMENT_(\d+)__/g, (_, index) => {
      return `<span style="color: #6a9955;">${commentPlaceholders[parseInt(index)]}</span>`;
    });
  }
  // Python highlighting
  else if (lang === 'python' || lang === 'py') {
    // Protect comments first
    const pyComments: string[] = [];
    escaped = escaped.replace(/(#.*$)/gm, (match) => {
      pyComments.push(match);
      return `__PYCOMMENT_${pyComments.length - 1}__`;
    });
    
    escaped = escaped
      // Strings
      .replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g, '<span style="color: #ce9178;">$1</span>')
      // Keywords
      .replace(/\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|raise|with|lambda|True|False|None|and|or|not|in|is)\b/g, '<span style="color: #569cd6;">$1</span>')
      // Numbers
      .replace(/(?<![a-zA-Z_])\b(\d+\.?\d*)\b/g, '<span style="color: #b5cea8;">$1</span>');
    
    // Restore comments with highlighting
    escaped = escaped.replace(/__PYCOMMENT_(\d+)__/g, (_, index) => {
      return `<span style="color: #6a9955;">${pyComments[parseInt(index)]}</span>`;
    });
  }
  // Bash/Shell highlighting
  else if (lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'zsh') {
    // Protect comments first
    const shComments: string[] = [];
    escaped = escaped.replace(/(#.*$)/gm, (match) => {
      shComments.push(match);
      return `__SHCOMMENT_${shComments.length - 1}__`;
    });
    
    escaped = escaped
      // Strings
      .replace(/("([^"\\]|\\.)*"|'[^']*')/g, '<span style="color: #ce9178;">$1</span>')
      // Variables
      .replace(/(\$\w+|\$\{[^}]+\})/g, '<span style="color: #9cdcfe;">$1</span>');
    
    // Restore comments with highlighting
    escaped = escaped.replace(/__SHCOMMENT_(\d+)__/g, (_, index) => {
      return `<span style="color: #6a9955;">${shComments[parseInt(index)]}</span>`;
    });
  }
  // HTML/XML highlighting
  else if (lang === 'html' || lang === 'xml' || lang === 'svg') {
    escaped = escaped
      // Tags
      .replace(/(&lt;\/?[\w-]+)/g, '<span style="color: #569cd6;">$1</span>')
      // Attributes
      .replace(/(\s[\w-]+)=/g, '<span style="color: #9cdcfe;">$1</span>=')
      // Strings
      .replace(/"([^"]*)"/g, '"<span style="color: #ce9178;">$1</span>"');
  }
  // CSS highlighting
  else if (lang === 'css' || lang === 'scss' || lang === 'less') {
    escaped = escaped
      // Selectors
      .replace(/^([^{]+)\{/gm, '<span style="color: #d7ba7d;">$1</span>{')
      // Properties
      .replace(/([\w-]+):/g, '<span style="color: #9cdcfe;">$1</span>:')
      // Values with units
      .replace(/:\s*([^;]+);/g, ': <span style="color: #ce9178;">$1</span>;');
  }
  
  return escaped;
};

// Rebuild code blocks with plain text to bypass all CSS issues
const rebuildCodeBlocks = (container: HTMLElement): void => {
  // Find all pre elements and rebuild them with just the text content
  container.querySelectorAll('pre').forEach((pre) => {
    const preEl = pre as HTMLElement;
    
    // Try to detect the language from class names or sibling elements
    let language = '';
    const codeEl = preEl.querySelector('code');
    
    // Check for language in various places
    const classesToCheck = [
      codeEl?.className || '',
      preEl.className || '',
      preEl.closest('[class*="language-"]')?.className || '',
      preEl.closest('[data-language]')?.getAttribute('data-language') || ''
    ].join(' ');
    
    const langMatch = classesToCheck.match(/language-(\w+)|lang-(\w+)|hljs\s+(\w+)/);
    if (langMatch) {
      language = langMatch[1] || langMatch[2] || langMatch[3] || '';
    }
    
    // Also check for language label in nearby elements (ChatGPT puts it in a span)
    const codeBlockWrapper = preEl.closest('[class*="code"]') || preEl.parentElement;
    if (codeBlockWrapper) {
      const langSpan = codeBlockWrapper.querySelector('span');
      if (langSpan && langSpan.textContent && langSpan.textContent.length < 20) {
        const potentialLang = langSpan.textContent.toLowerCase().trim();
        if (['json', 'javascript', 'js', 'python', 'py', 'bash', 'sh', 'html', 'css', 'typescript', 'ts', 'java', 'c', 'cpp', 'go', 'rust', 'sql', 'yaml', 'xml'].includes(potentialLang)) {
          language = potentialLang;
        }
      }
    }
    
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
    
    // Clean up the text - remove "Copy code" artifacts and language labels at start
    textContent = textContent
      .replace(/^[\s]*Copy code[\s]*/i, '')
      .replace(/^[\s]*Copy[\s]*/i, '')
      .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*Copy code[\s]*/i, '')
      .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*/i, '');
    
    // Skip if empty
    if (!textContent.trim()) return;
    
    // Get background color from computed styles
    const computedStyle = window.getComputedStyle(preEl);
    let bgColor = computedStyle.backgroundColor;
    // Default to dark theme if transparent
    if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
      bgColor = '#1e1e1e';
    }
    
    // Create a wrapper div for the code block
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
    
    // Create a clean pre/code structure with syntax highlighting
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

// Legacy function name for compatibility
const fixCodeBlocks = rebuildCodeBlocks;

// Filter out common header/footer UI elements that shouldn't be in exports
const filterNonConversationElements = (container: HTMLElement): void => {
  // Selectors for specific UI elements to remove (be careful not to remove content containers!)
  const selectorsToRemove = [
    // ChatGPT specific - target specific elements, not broad class patterns
    '[data-testid="model-switcher-dropdown-button"]',
    '[data-testid="share-chat-button"]',
    '[data-testid="start-group-chat-from-conversation-button"]',
    '[data-testid="conversation-options-button"]',
    '[data-testid="copy-turn-action-button"]',
    '[data-testid="good-response-turn-action-button"]',
    '[data-testid="bad-response-turn-action-button"]',
    '#page-header', // ChatGPT header
    '#thread-bottom-container', // ChatGPT input area
    '#thread-bottom',
    // Invisible positioning/edge elements (often cause white dots)
    '[data-edge="true"]',
    '.h-px.w-px', // 1px x 1px elements
    '.w-px', // 1px width elements
    '.h-px', // 1px height elements
    // Claude specific
    '[class*="ConversationHeader"]',
    '[class*="MessageInput"]',
    // Generic header/footer/nav elements
    'header#page-header',
    'footer',
    'nav',
    '[role="navigation"]',
    '[role="contentinfo"]',
    // Input forms (but not the whole page)
    'form[class*="composer"]',
    'textarea',
    '[contenteditable="true"]',
  ];

  // Text patterns for footer disclaimer - be very specific
  const footerPatterns = [
    /^ChatGPT can make mistakes\.?\s*Check important info\.?$/i,
    /^Claude can make mistakes\.?\s*Please double-check/i,
  ];

  // Remove elements by selector
  selectorsToRemove.forEach(selector => {
    try {
      container.querySelectorAll(selector).forEach(el => {
        // Don't remove if it contains substantial conversation content
        const text = el.textContent || '';
        if (text.length < 500) { // Only remove if relatively short (likely UI element)
          el.remove();
        }
      });
    } catch (e) {
      // Invalid selector, skip
    }
  });
  
  // Remove UI buttons with specific aria-labels (be precise, don't remove all buttons)
  const uiAriaLabels = [
    'Copy', 'Edit message', 'Good response', 'Bad response', 
    'More actions', 'Share', 'Model selector'
  ];
  uiAriaLabels.forEach(label => {
    container.querySelectorAll(`[aria-label="${label}"], [aria-label^="${label}"]`).forEach(el => {
      el.remove();
    });
  });

  // Remove footer disclaimer text
  const removeFooterText = (element: Element) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      null
    );
    
    const toRemove: Element[] = [];
    let node: Element | null;
    while ((node = walker.nextNode() as Element | null)) {
      const text = node.textContent?.trim() || '';
      // Only match exact footer disclaimer patterns
      for (const pattern of footerPatterns) {
        if (pattern.test(text) && text.length < 100) {
          toRemove.push(node);
          break;
        }
      }
    }
    
    toRemove.forEach(el => el.remove());
  };
  
  removeFooterText(container);

  // Remove small SVG icons (likely UI icons, not content)
  container.querySelectorAll('svg').forEach(svg => {
    // Keep SVGs inside code blocks or that are large (diagrams)
    const isInCode = svg.closest('pre, code');
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    const isSmall = (width && parseInt(width) <= 24) || (height && parseInt(height) <= 24);
    
    if (!isInCode && isSmall) {
      svg.remove();
    }
  });

  // Remove aria-hidden elements that are empty or tiny (decorative/UI elements)
  container.querySelectorAll('[aria-hidden="true"]').forEach(el => {
    const htmlEl = el as HTMLElement;
    const text = htmlEl.textContent?.trim() || '';
    const rect = htmlEl.getBoundingClientRect();
    
    // Remove if empty or very small (likely decorative dots/spinners)
    if (text.length === 0 || (rect.width <= 10 && rect.height <= 10)) {
      htmlEl.remove();
    }
  });

  // Remove pointer-events-none elements that are likely decorative overlays
  container.querySelectorAll('.pointer-events-none').forEach(el => {
    const htmlEl = el as HTMLElement;
    const text = htmlEl.textContent?.trim() || '';
    // Only remove if empty (purely visual elements)
    if (text.length === 0) {
      htmlEl.remove();
    }
  });
};

// Enhance element HTML with stored computed styles or find original element
const enhanceElementWithStyles = (element: SelectedElement): string => {
  // First, try to find the original element in the DOM
  let originalElement: HTMLElement | null = null;
  
  if (element.originalId) {
    originalElement = document.getElementById(element.originalId);
  }
  
  // If not found by ID, try to find by matching content
  if (!originalElement && element.content) {
    const allElements = document.querySelectorAll('*');
    for (const elem of Array.from(allElements)) {
      if (elem.outerHTML === element.content || 
          (elem as HTMLElement).className === element.className && 
          elem.tagName.toLowerCase() === element.tagName) {
        originalElement = elem as HTMLElement;
        break;
      }
    }
  }
  
  // If we found the original element, clone it and apply computed styles
  if (originalElement) {
    const clone = originalElement.cloneNode(true) as HTMLElement;
    
    // Filter out header/footer UI elements before processing
    filterNonConversationElements(clone);
    
    // Fix code blocks first to ensure all content is visible
    fixCodeBlocks(clone);
    
    // First, capture user message bubble styles from the ORIGINAL element (before cloning)
    // since CSS classes may not work on detached elements
    const originalUserBubbles = originalElement.querySelectorAll('.user-message-bubble-color');
    const userBubbleStyles = new Map<string, { bg: string; color: string }>();
    originalUserBubbles.forEach((bubble, index) => {
      const computed = window.getComputedStyle(bubble as HTMLElement);
      const bgColor = computed.backgroundColor;
      const textColor = computed.color;
      userBubbleStyles.set(`bubble-${index}`, {
        bg: bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' ? bgColor : '',
        color: textColor || ''
      });
    });
    
    // Apply captured styles to cloned bubbles and their children
    const clonedUserBubbles = clone.querySelectorAll('.user-message-bubble-color');
    clonedUserBubbles.forEach((bubble, index) => {
      const styles = userBubbleStyles.get(`bubble-${index}`);
      if (styles) {
        const el = bubble as HTMLElement;
        if (styles.bg) {
          el.style.backgroundColor = styles.bg;
        }
        // Apply text color to bubble and all children
        const textColor = styles.color || '#ffffff'; // Default to white for readability
        el.style.color = textColor;
        el.querySelectorAll('*').forEach(child => {
          (child as HTMLElement).style.color = textColor;
        });
      }
    });
    
    // Recursively apply computed styles as inline styles
    const applyComputedStyles = (el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      const inlineStyle = el.getAttribute('style') || '';
      const tagName = el.tagName.toLowerCase();
      
      // Check element types for special handling
      const isPre = tagName === 'pre';
      const isCodeInPre = tagName === 'code' && el.parentElement?.tagName.toLowerCase() === 'pre';
      const isSpanInCode = tagName === 'span' && el.closest('pre, code');
      
      // SKIP applying most styles to spans inside code - preserve syntax highlighting colors
      if (isSpanInCode) {
        // For syntax highlighting spans, preserve existing inline color if set (from highlightCode)
        const existingStyle = el.getAttribute('style') || '';
        // Check for valid color value (hex, rgb, named colors)
        const colorMatch = existingStyle.match(/color:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|[a-z]+)/i);
        
        if (!colorMatch) {
          // Only set color if not already set by highlighting
          const computedColor = computed.color;
          if (computedColor && computedColor !== 'rgba(0, 0, 0, 0)') {
            el.setAttribute('style', `color: ${computedColor}`);
          }
        }
        // If inline color exists, leave it alone - don't touch it!
        
        // Process children
        Array.from(el.children).forEach(child => {
          applyComputedStyles(child as HTMLElement);
        });
        return;
      }
      
      // Important visual properties to preserve (for non-span elements)
          const styleProps: { [key: string]: string } = {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            background: computed.background,
            backgroundImage: computed.backgroundImage,
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            padding: computed.padding,
            paddingTop: computed.paddingTop,
            paddingRight: computed.paddingRight,
            paddingBottom: computed.paddingBottom,
            paddingLeft: computed.paddingLeft,
            margin: computed.margin,
            marginTop: computed.marginTop,
            marginRight: computed.marginRight,
            marginBottom: computed.marginBottom,
            marginLeft: computed.marginLeft,
            border: computed.border,
            borderTop: computed.borderTop,
            borderRight: computed.borderRight,
            borderBottom: computed.borderBottom,
            borderLeft: computed.borderLeft,
            borderRadius: computed.borderRadius,
        display: (isPre || isCodeInPre) ? 'block' : computed.display,
            flexDirection: computed.flexDirection,
            gap: computed.gap,
        width: (isPre || isCodeInPre) ? 'auto' : computed.width,
        maxWidth: (isPre || isCodeInPre) ? '100%' : computed.maxWidth,
            minWidth: computed.minWidth,
            textAlign: computed.textAlign,
            opacity: computed.opacity,
            boxShadow: computed.boxShadow,
          };
          
          // Also capture CSS custom properties (variables) if they exist
          const cssVars: string[] = [];
          for (let i = 0; i < document.styleSheets.length; i++) {
            try {
              const sheet = document.styleSheets[i];
              if (sheet.cssRules) {
                for (let j = 0; j < sheet.cssRules.length; j++) {
                  const rule = sheet.cssRules[j];
                  if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
                    for (let k = 0; k < rule.style.length; k++) {
                      const prop = rule.style[k];
                      if (prop.startsWith('--')) {
                        cssVars.push(`${prop}: ${rule.style.getPropertyValue(prop)}`);
                      }
                    }
                  }
                }
              }
            } catch (e) {
              // Cross-origin stylesheets will throw errors, skip them
            }
          }
      
      // Build style string
      const styleString = Object.entries(styleProps)
        .filter(([_, value]) => value && value !== 'none' && value !== 'normal' && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent')
        .map(([prop, value]) => {
          // Convert camelCase to kebab-case
          const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${kebabProp}: ${value}`;
        })
        .join('; ');
      
      if (styleString) {
        el.setAttribute('style', `${inlineStyle}${inlineStyle ? '; ' : ''}${styleString}`);
      }
      
      // Process children
      Array.from(el.children).forEach(child => {
        applyComputedStyles(child as HTMLElement);
      });
    };
    
    applyComputedStyles(clone);
    return clone.outerHTML;
  }
  
  // Fallback: use stored computed styles if available
  if (element.computedStyles && Object.keys(element.computedStyles).length > 0) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(element.content, 'text/html');
      const rootEl = doc.body.firstElementChild as HTMLElement;
      
      if (rootEl) {
        // Filter out header/footer UI elements
        filterNonConversationElements(rootEl);
        
        const styleString = Object.entries(element.computedStyles)
          .map(([prop, value]) => {
            const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${kebabProp}: ${value}`;
          })
          .join('; ');
        
        const existingStyle = rootEl.getAttribute('style') || '';
        rootEl.setAttribute('style', `${existingStyle}${existingStyle ? '; ' : ''}${styleString}`);
        return rootEl.outerHTML;
      }
    } catch (err) {
      console.warn('Error applying stored styles:', err);
    }
  }
  
  // Final fallback: parse and filter the original content
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(element.content, 'text/html');
    const rootEl = doc.body.firstElementChild as HTMLElement;
    if (rootEl) {
      filterNonConversationElements(rootEl);
      return rootEl.outerHTML;
    }
  } catch (e) {
    // If parsing fails, return as-is
  }
  return element.content;
};

export const generateExportHTML = (elements: SelectedElement[]) => {
  const styles = getPageStyles();
  
  // Enhance elements with computed styles
  const enhancedContent = elements.map(el => {
    try {
      return enhanceElementWithStyles(el);
    } catch (err) {
      console.warn('Error enhancing element:', err);
      return el.content;
    }
  }).join('\n');

  // Get background color from document
  const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
  const htmlBgColor = window.getComputedStyle(document.documentElement).backgroundColor;
  const bgColor = (bodyBgColor && bodyBgColor !== 'rgba(0, 0, 0, 0)') 
    ? bodyBgColor 
    : (htmlBgColor && htmlBgColor !== 'rgba(0, 0, 0, 0)') 
      ? htmlBgColor 
      : '#ffffff';

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Export - ${new Date().toLocaleDateString()}</title>
      <base href="${window.location.origin}">
      <!-- Google Fonts -->
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
      ${styles}
      <style>
        :root {
          /* Preserve CSS variables from the original page */
        }
        * {
          box-sizing: border-box;
        }
    html, body {
      margin: 0;
      padding: 0;
      background-color: ${bgColor};
        }
        body { 
          padding: 40px; 
          max-width: 1200px; 
          margin: 0 auto; 
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    }
    .ai-chat-export-wrapper {
      /* Remove all overflow constraints for printing */
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
        }
        .ai-chat-export-item {
          position: relative;
          margin-bottom: 30px;
      /* Remove overflow constraints */
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }
    /* Remove overflow from all elements for better printing */
    .ai-chat-export-item * {
      overflow: visible !important;
      max-height: none !important;
    }
    /* Hide decorative UI elements that might cause white dots */
    .ai-chat-export-item [data-edge="true"],
    .ai-chat-export-item .h-px,
    .ai-chat-export-item .w-px,
    .ai-chat-export-item .h-px.w-px,
    .ai-chat-export-item [aria-hidden="true"]:empty,
    .ai-chat-export-item .pointer-events-none:empty {
      display: none !important;
    }
    /* But allow specific elements to maintain scroll behavior if needed */
    /* Rebuilt code blocks - clean styling */
    .ai-chat-export-item .exported-code-wrapper {
      position: relative !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      margin: 1em 0 !important;
    }
    .ai-chat-export-item .exported-code-lang {
      position: absolute !important;
      top: 8px !important;
      right: 12px !important;
      font-size: 11px !important;
      color: #6b7280 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-weight: 500 !important;
      text-transform: lowercase !important;
      letter-spacing: 0.02em !important;
      user-select: none !important;
      pointer-events: none !important;
    }
    .ai-chat-export-item pre.exported-code-block {
      overflow-x: auto !important;
      overflow-y: visible !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      max-width: 100% !important;
      padding: 1em !important;
      margin: 0 !important;
      border-radius: 0 !important;
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace !important;
      font-size: 13px !important;
      line-height: 1.6 !important;
      color: #d4d4d4 !important;
    }
    .ai-chat-export-item pre.exported-code-block code {
      display: block !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      overflow: visible !important;
      font-family: inherit !important;
    }
    /* AGGRESSIVE: Remove overflow from ALL elements that might contain code */
    .ai-chat-export-item [class*="code"],
    .ai-chat-export-item [class*="Code"],
    .ai-chat-export-item [class*="highlight"],
    .ai-chat-export-item [class*="Highlight"],
    .ai-chat-export-item [class*="markdown"],
    .ai-chat-export-item [class*="Markdown"] {
      overflow: visible !important;
      overflow-x: visible !important;
      overflow-y: visible !important;
      max-height: none !important;
      max-width: 100% !important;
    }
    /* Code block styling - fallback for non-rebuilt code blocks */
    .ai-chat-export-item pre:not(.exported-code-block) {
      overflow: visible !important;
      overflow-x: visible !important;
      overflow-y: visible !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      max-height: none !important;
      height: auto !important;
      width: auto !important;
      max-width: 100% !important;
      padding: 1em !important;
      margin: 0.5em 0 !important;
      border-radius: 6px;
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace !important;
      font-size: 13px !important;
      line-height: 1.6 !important;
      tab-size: 2;
    }
    .ai-chat-export-item code {
      font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace !important;
      font-size: inherit !important;
      overflow: visible !important;
    }
    .ai-chat-export-item pre:not(.exported-code-block) > code,
    .ai-chat-export-item pre:not(.exported-code-block) code {
      overflow: visible !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      word-break: break-word !important;
      display: block !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
      max-width: 100% !important;
    }
    /* CRITICAL: Keep syntax highlighting spans inline and remove width constraints */
    .ai-chat-export-item pre span,
    .ai-chat-export-item pre code span,
    .ai-chat-export-item code span {
      display: inline !important;
      white-space: inherit !important;
      width: auto !important;
      max-width: none !important;
      min-width: auto !important;
      overflow: visible !important;
    }
    /* Inline code */
    .ai-chat-export-item :not(pre) > code {
      padding: 0.2em 0.4em !important;
      border-radius: 3px !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    /* Fix ALL divs inside the export that might have overflow */
    .ai-chat-export-item div {
      overflow: visible !important;
      overflow-x: visible !important;
      max-height: none !important;
        }
        @media print {
      html, body {
        background-color: ${bgColor} !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
          body {
            padding: 20px;
          }
          .ai-chat-export-item {
        break-inside: auto;
        page-break-inside: auto;
      }
      /* Allow page breaks in long conversations */
      .ai-chat-export-item > * {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        img {
          max-width: 100%;
          height: auto;
        }
        pre, code {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      </style>
    </head>
    <body>
  <div class="ai-chat-export-wrapper">
      <div class="ai-chat-export-item">
        ${enhancedContent}
    </div>
      </div>
      <script>
        // Syntax highlighting for common languages
        // Uses placeholder approach to prevent regex conflicts
        const highlightCode = (code, language) => {
          let escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          
          const lang = (language || '').toLowerCase();
          
          // JSON highlighting
          if (lang === 'json') {
            escaped = escaped.replace(/"([^"\\\\\\\\]|\\\\\\\\.)*"/g, function(match, _, offset, string) {
              var afterMatch = string.slice(offset + match.length);
              var isKey = /^\\s*:/.test(afterMatch);
              if (isKey) {
                return '<span style="color: #f472b6;">' + match + '</span>';
              } else {
                return '<span style="color: #4ade80;">' + match + '</span>';
              }
            });
            escaped = escaped.replace(/\\b(-?\\d+\\.?\\d*)\\b/g, '<span style="color: #b5cea8;">$1</span>');
            escaped = escaped.replace(/\\b(true|false|null)\\b/g, '<span style="color: #569cd6;">$1</span>');
          }
          // JavaScript/TypeScript highlighting - protect comments first
          else if (['javascript', 'js', 'typescript', 'ts'].includes(lang)) {
            var jsComments = [];
            escaped = escaped.replace(/(\\/\\/.*$)/gm, function(match) {
              jsComments.push(match);
              return '__JSCOMMENT_' + (jsComments.length - 1) + '__';
            });
            escaped = escaped.replace(/(\\/\\*[\\s\\S]*?\\*\\/)/g, function(match) {
              jsComments.push(match);
              return '__JSCOMMENT_' + (jsComments.length - 1) + '__';
            });
            escaped = escaped
              .replace(/("([^"\\\\]|\\\\.)*"|'([^'\\\\]|\\\\.)*'|\`([^\`\\\\]|\\\\.)*\`)/g, '<span style="color: #ce9178;">$1</span>')
              .replace(/\\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\\b/g, '<span style="color: #569cd6;">$1</span>')
              .replace(/\\b(\\d+\\.?\\d*)\\b/g, '<span style="color: #b5cea8;">$1</span>');
            escaped = escaped.replace(/__JSCOMMENT_(\\d+)__/g, function(_, index) {
              return '<span style="color: #6a9955;">' + jsComments[parseInt(index)] + '</span>';
            });
          }
          // Python highlighting - protect comments first
          else if (['python', 'py'].includes(lang)) {
            var pyComments = [];
            escaped = escaped.replace(/(#.*$)/gm, function(match) {
              pyComments.push(match);
              return '__PYCOMMENT_' + (pyComments.length - 1) + '__';
            });
            escaped = escaped
              .replace(/("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"([^"\\\\]|\\\\.)*"|\'([^\'\\\\]|\\\\.)*\')/g, '<span style="color: #ce9178;">$1</span>')
              .replace(/\\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|raise|with|lambda|True|False|None|and|or|not|in|is)\\b/g, '<span style="color: #569cd6;">$1</span>')
              .replace(/\\b(\\d+\\.?\\d*)\\b/g, '<span style="color: #b5cea8;">$1</span>');
            escaped = escaped.replace(/__PYCOMMENT_(\\d+)__/g, function(_, index) {
              return '<span style="color: #6a9955;">' + pyComments[parseInt(index)] + '</span>';
            });
          }
          // Bash/Shell highlighting - protect comments first
          else if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) {
            var shComments = [];
            escaped = escaped.replace(/(#.*$)/gm, function(match) {
              shComments.push(match);
              return '__SHCOMMENT_' + (shComments.length - 1) + '__';
            });
            escaped = escaped
              .replace(/("([^"\\\\]|\\\\.)*"|\'[^\']*\')/g, '<span style="color: #ce9178;">$1</span>')
              .replace(/(\\$\\w+|\\$\\{[^}]+\\})/g, '<span style="color: #9cdcfe;">$1</span>');
            escaped = escaped.replace(/__SHCOMMENT_(\\d+)__/g, function(_, index) {
              return '<span style="color: #6a9955;">' + shComments[parseInt(index)] + '</span>';
            });
          }
          // HTML/XML highlighting
          else if (['html', 'xml', 'svg'].includes(lang)) {
            escaped = escaped
              .replace(/(&lt;\\/?[\\w-]+)/g, '<span style="color: #569cd6;">$1</span>')
              .replace(/(\\s[\\w-]+)=/g, '<span style="color: #9cdcfe;">$1</span>=')
              .replace(/"([^"]*)"/g, '"<span style="color: #ce9178;">$1</span>"');
          }
          // CSS highlighting
          else if (['css', 'scss', 'less'].includes(lang)) {
            escaped = escaped
              .replace(/^([^{]+)\\{/gm, '<span style="color: #d7ba7d;">$1</span>{')
              .replace(/([\\w-]+):/g, '<span style="color: #9cdcfe;">$1</span>:')
              .replace(/:\\s*([^;]+);/g, ': <span style="color: #ce9178;">$1</span>;');
          }
          // SQL highlighting - protect comments first
          else if (lang === 'sql') {
            var sqlComments = [];
            escaped = escaped.replace(/(--.*$)/gm, function(match) {
              sqlComments.push(match);
              return '__SQLCOMMENT_' + (sqlComments.length - 1) + '__';
            });
            escaped = escaped
              .replace(/('([^'\\\\]|\\\\.)*')/g, '<span style="color: #ce9178;">$1</span>')
              .replace(/\\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|DISTINCT|INTO|VALUES|SET)\\b/gi, '<span style="color: #569cd6;">$&</span>')
              .replace(/\\b(\\d+\\.?\\d*)\\b/g, '<span style="color: #b5cea8;">$1</span>');
            escaped = escaped.replace(/__SQLCOMMENT_(\\d+)__/g, function(_, index) {
              return '<span style="color: #6a9955;">' + sqlComments[parseInt(index)] + '</span>';
            });
          }
          
          return escaped;
        };

        // Fix image sources to use absolute URLs
        document.querySelectorAll('img').forEach(img => {
          if (img.src && !img.src.startsWith('http')) {
            try {
              const absoluteUrl = new URL(img.src, window.location.href).href;
              img.src = absoluteUrl;
            } catch (e) {
              console.warn('Could not fix image URL:', img.src);
            }
          }
        });
    
        // Code blocks - rebuild any that weren't processed
        document.querySelectorAll('pre:not(.exported-code-block)').forEach(pre => {
          // Try to detect language
          let language = '';
          const codeEl = pre.querySelector('code');
          const classesToCheck = [
            codeEl?.className || '',
            pre.className || '',
            pre.closest('[class*="language-"]')?.className || '',
            pre.closest('[data-language]')?.getAttribute('data-language') || ''
          ].join(' ');
          
          const langMatch = classesToCheck.match(/language-(\\w+)|lang-(\\w+)|hljs\\s+(\\w+)/);
          if (langMatch) {
            language = langMatch[1] || langMatch[2] || langMatch[3] || '';
          }
          
          // Also check for language label in nearby elements
          const codeBlockWrapper = pre.closest('[class*="code"]') || pre.parentElement;
          if (codeBlockWrapper && !language) {
            const langSpan = codeBlockWrapper.querySelector('span');
            if (langSpan && langSpan.textContent && langSpan.textContent.length < 20) {
              const potentialLang = langSpan.textContent.toLowerCase().trim();
              const knownLangs = ['json', 'javascript', 'js', 'python', 'py', 'bash', 'sh', 'html', 'css', 'typescript', 'ts', 'java', 'c', 'cpp', 'go', 'rust', 'sql', 'yaml', 'xml', 'shell'];
              if (knownLangs.includes(potentialLang)) {
                language = potentialLang;
              }
            }
          }
          
          let textContent = codeEl ? codeEl.textContent : pre.textContent;
          textContent = (textContent || '').trim();
          if (!textContent) return;
          
          // Clean up toolbar artifacts
          textContent = textContent
            .replace(/^[\\s]*Copy code[\\s]*/i, '')
            .replace(/^[\\s]*Copy[\\s]*/i, '')
            .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\\s]*Copy[\\s]*/i, '')
            .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\\s]*/i, '');
          
          const computedStyle = window.getComputedStyle(pre);
          let bgColor = computedStyle.backgroundColor;
          if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            bgColor = '#1e1e1e';
          }
          
          // Create wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'exported-code-wrapper';
          wrapper.style.cssText = 'position: relative; border-radius: 8px; overflow: hidden; margin: 1em 0; background-color: ' + bgColor + ';';
          
          // Add subtle language badge
          if (language) {
            const badge = document.createElement('div');
            badge.className = 'exported-code-lang';
            badge.style.cssText = 'position: absolute; top: 8px; right: 12px; font-size: 11px; color: #6b7280; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 500; text-transform: lowercase; letter-spacing: 0.02em; user-select: none; pointer-events: none;';
            badge.textContent = language;
            wrapper.appendChild(badge);
          }
          
          const newPre = document.createElement('pre');
          newPre.className = 'exported-code-block';
          newPre.setAttribute('data-language', language);
          newPre.style.cssText = 'background-color: ' + bgColor + '; color: #d4d4d4; padding: 1em; padding-top: ' + (language ? '2em' : '1em') + '; margin: 0; overflow-x: auto; overflow-y: visible; white-space: pre-wrap; word-wrap: break-word; word-break: break-word; font-family: "JetBrains Mono", "SF Mono", "Fira Code", Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6;';
          
          const newCode = document.createElement('code');
          newCode.style.cssText = 'display: block; white-space: pre-wrap; word-wrap: break-word; word-break: break-word; overflow: visible; font-family: inherit;';
          
          // Apply syntax highlighting
          if (language) {
            newCode.innerHTML = highlightCode(textContent, language);
          } else {
            newCode.textContent = textContent;
          }
          
          newPre.appendChild(newCode);
          wrapper.appendChild(newPre);
          
          // Replace the old element
          const existingWrapper = pre.closest('[class*="code-block"], [class*="codeblock"], [class*="highlight"]');
          if (existingWrapper && existingWrapper.parentNode) {
            existingWrapper.parentNode.replaceChild(wrapper, existingWrapper);
          } else if (pre.parentNode) {
            pre.parentNode.replaceChild(wrapper, pre);
          }
        });
    
        // Fix any remaining overflow issues
        document.querySelectorAll('div:not(.exported-code-wrapper):not(.exported-code-header)').forEach(div => {
          div.style.overflow = 'visible';
          div.style.maxHeight = 'none';
        });
      </script>
    </body>
</html>`;
};

// Map file extensions to descriptions and accept types for save dialog
const getFileTypeInfo = (filename: string): { description: string; accept: Record<string, string[]> } => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'html':
      return { description: 'HTML Document', accept: { 'text/html': ['.html', '.htm'] } };
    case 'json':
      return { description: 'JSON File', accept: { 'application/json': ['.json'] } };
    case 'md':
      return { description: 'Markdown Document', accept: { 'text/markdown': ['.md', '.markdown'] } };
    case 'pdf':
      return { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } };
    default:
      return { description: 'Text File', accept: { 'text/plain': ['.txt'] } };
  }
};

export const downloadBlob = async (content: string, filename: string, contentType: string): Promise<void> => {
  const blob = new Blob([content], { type: contentType });
  
  // Try to use the File System Access API for "Save As" dialog
  if ('showSaveFilePicker' in window) {
    try {
      const fileTypeInfo = getFileTypeInfo(filename);
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: fileTypeInfo.description,
          accept: fileTypeInfo.accept,
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the save dialog or API not fully supported
      if (err.name === 'AbortError') {
        // User cancelled - don't fall back, just return
        return;
      }
      // For other errors, fall back to traditional download
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }
  
  // Fallback: traditional download (for browsers without File System Access API)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Simple HTML to Markdown converter (no external dependencies)
const htmlToMarkdown = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
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
  
  let markdown = processNode(doc.body);
  
  // Clean up excessive newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
};

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

export const generateExportPDF = async (elements: SelectedElement[]): Promise<Blob> => {
  // Create a temporary container for rendering
  // CRITICAL: Don't use fixed positioning or constrain height - let content flow naturally
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.top = '0';
  tempContainer.style.left = '-9999px'; // Off-screen but still in document flow
  tempContainer.style.width = '794px'; // A4 width at 96 DPI (210mm)
  tempContainer.style.maxWidth = '794px';
  tempContainer.style.minHeight = '100px';
    tempContainer.style.padding = '40px';
    tempContainer.style.backgroundColor = 'transparent';
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.zIndex = '-9999';
  // CRITICAL: Allow content to expand to full height - no overflow constraints
  tempContainer.style.overflow = 'visible';
  tempContainer.style.height = 'auto'; // Let it grow to fit all content
  tempContainer.style.display = 'block';
  document.body.appendChild(tempContainer);

  try {
    if (!elements || elements.length === 0) {
      throw new Error('No elements selected for export');
    }

    console.log('Exporting', elements.length, 'elements');

    // Enhance elements with computed styles
    const enhancedContent = elements.map((el, index) => {
      try {
        const enhanced = enhanceElementWithStyles(el);
        console.log(`Element ${index + 1}:`, {
          originalLength: el.content.length,
          enhancedLength: enhanced.length,
          hasContent: enhanced.trim().length > 0
        });
        return enhanced;
      } catch (err) {
        console.warn('Error enhancing element for PDF:', err, el);
        return el.content || '';
      }
    }).filter(content => content && content.trim().length > 0).join('\n');

    if (!enhancedContent || enhancedContent.trim().length === 0) {
      throw new Error('No content generated from selected elements');
    }

    console.log('Total enhanced content length:', enhancedContent.length);

    // Create the HTML content
    const styles = getPageStyles();
    
    // Extract CSS variables from the page
    const cssVariables: string[] = [];
    try {
      const rootStyleSheet = Array.from(document.styleSheets);
      for (const sheet of rootStyleSheet) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
              for (let i = 0; i < rule.style.length; i++) {
                const prop = rule.style[i];
                if (prop.startsWith('--')) {
                  cssVariables.push(`  ${prop}: ${rule.style.getPropertyValue(prop)};`);
                }
              }
            }
          }
        } catch (e) {
          // Skip cross-origin stylesheets
        }
      }
    } catch (e) {
      console.warn('Could not extract CSS variables:', e);
    }

    tempContainer.innerHTML = `
      <style>
        :root {
${cssVariables.join('\n')}
        }
        ${styles}
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: transparent;
        }
        html {
          background-color: transparent;
        }
        .ai-chat-export-item {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        pre {
          overflow: visible !important;
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          max-height: none !important;
          height: auto !important;
          max-width: 100% !important;
          font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace !important;
        }
        pre > code {
          overflow: visible !important;
          white-space: inherit !important;
          display: block !important;
        }
        /* CRITICAL: Keep syntax spans inline and remove width constraints */
        pre span, code span {
          display: inline !important;
          white-space: inherit !important;
          width: auto !important;
          max-width: none !important;
        }
        code {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
        }
        /* Ensure text is visible */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      </style>
      <div class="ai-chat-export-item">
${enhancedContent}
      </div>
    `;

    // Fix image sources
    tempContainer.querySelectorAll('img').forEach(img => {
      if (img.src && !img.src.startsWith('http')) {
        try {
          const absoluteUrl = new URL(img.src, window.location.href).href;
          img.src = absoluteUrl;
        } catch (e) {
          console.warn('Could not fix image URL:', img.src);
        }
      }
    });
    
    // Fix code blocks for PDF rendering
    fixCodeBlocks(tempContainer);

    // Verify content exists
    const contentElement = tempContainer.querySelector('.ai-chat-export-item');
    if (!contentElement || !contentElement.innerHTML.trim()) {
      throw new Error('No content to export');
    }

    // Move container into view for html2canvas (it needs to be visible in render tree)
    tempContainer.style.left = '0';
    tempContainer.style.visibility = 'visible';
    tempContainer.style.opacity = '1';
    
    // Force a reflow to ensure rendering
    void tempContainer.offsetHeight;
    
    // Get the actual content height after reflow
    const contentHeight = tempContainer.scrollHeight;
    console.log('Content height for PDF:', contentHeight);

    // Wait for images and fonts to load
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get the computed background color from the first element or container
    let bgColor: string | null = null;
    try {
      const firstElement = tempContainer.querySelector('.ai-chat-export-item > *');
      if (firstElement) {
        const computed = window.getComputedStyle(firstElement as HTMLElement);
        bgColor = computed.backgroundColor;
        // If background is transparent, check parent
        if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          bgColor = window.getComputedStyle(document.body).backgroundColor;
        }
      }
    } catch (e) {
      // Fallback to body background
      bgColor = window.getComputedStyle(document.body).backgroundColor;
    }
    
    // Use detected background or default to white
    const finalBgColor = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' 
      ? bgColor 
      : '#ffffff';

    console.log('Generating PDF with content length:', contentElement.innerHTML.length);
    console.log('Background color:', finalBgColor);

    // Convert to canvas - preserve the background color
    // CRITICAL: Set windowHeight to match content to avoid clipping
    const canvas = await html2canvas(tempContainer, {
      backgroundColor: finalBgColor === '#ffffff' ? '#ffffff' : finalBgColor,
      scale: 2,
      useCORS: true,
      logging: true, // Enable logging to debug
      allowTaint: true,
      foreignObjectRendering: true,
      removeContainer: false,
      // CRITICAL: Set window dimensions to capture all content
      windowWidth: 794,
      windowHeight: Math.max(contentHeight + 100, window.innerHeight),
      height: contentHeight + 50, // Capture full height
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, element) => {
        // Make sure the cloned element is visible and not constrained
        const clonedContainer = clonedDoc.querySelector('.ai-chat-export-item');
        if (clonedContainer) {
          const el = clonedContainer as HTMLElement;
          el.style.display = 'block';
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.height = 'auto';
          el.style.maxHeight = 'none';
          el.style.overflow = 'visible';
        }
        // Ensure the main container is visible and not constrained in clone
        if (element instanceof HTMLElement) {
          element.style.visibility = 'visible';
          element.style.opacity = '1';
          element.style.height = 'auto';
          element.style.maxHeight = 'none';
          element.style.overflow = 'visible';
          element.style.position = 'static'; // Remove positioning constraints
        }
        // Also remove overflow constraints from any scrollable parents in clone
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            const computed = clonedDoc.defaultView?.getComputedStyle(htmlEl);
            if (computed?.overflow === 'auto' || computed?.overflow === 'scroll' ||
                computed?.overflowY === 'auto' || computed?.overflowY === 'scroll') {
              htmlEl.style.overflow = 'visible';
              htmlEl.style.overflowY = 'visible';
              htmlEl.style.height = 'auto';
              htmlEl.style.maxHeight = 'none';
            }
          }
        });
      },
    });

    // Move container off-screen again
    tempContainer.style.left = '-9999px';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.opacity = '0';

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Failed to capture content - canvas is empty');
    }

    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

    // Convert CSS color to RGB for jsPDF
    const parseColor = (color: string): [number, number, number] => {
      // Handle rgb/rgba format
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
      }
      // Handle hex format
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [r, g, b];
      }
      // Default to white
      return [255, 255, 255];
    };

    const [r, g, b] = parseColor(finalBgColor);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page - fill background first, then add image on top
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 210, pageHeight, 'F'); // Fill entire first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      
      // Fill entire page with background color first
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, 210, pageHeight, 'F');
      
      // Add image on top
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      
      heightLeft -= pageHeight;
    }

    // Generate blob
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } finally {
    // Clean up
    document.body.removeChild(tempContainer);
  }
};

// Helper to download a blob with save picker
const downloadBlobWithPicker = async (blob: Blob, filename: string, description: string, accept: Record<string, string[]>): Promise<boolean> => {
  // Try to use the File System Access API for "Save As" dialog
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description,
          accept,
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      // User cancelled the save dialog
      if (err.name === 'AbortError') {
        return false; // Indicate user cancelled
      }
      // For other errors, fall back to traditional download
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }
  
  // Fallback: traditional download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  return true;
};

export const downloadPDF = async (elements: SelectedElement[], filename: string) => {
  try {
    const blob = await generateExportPDF(elements);
    const saved = await downloadBlobWithPicker(
      blob, 
      filename, 
      'PDF Document', 
      { 'application/pdf': ['.pdf'] }
    );
    
    if (!saved) {
      // User cancelled - don't throw, just return
      return;
    }
  } catch (error: any) {
    console.error('PDF generation failed:', error);
    // Fallback: Generate HTML and let user print to PDF
    const html = generateExportHTML(elements);
    const blob = new Blob([html], { type: 'text/html' });
    
    const saved = await downloadBlobWithPicker(
      blob,
      filename.replace('.pdf', '.html'),
      'HTML Document',
      { 'text/html': ['.html', '.htm'] }
    );
    
    if (saved) {
      // Show alert to user only if they saved the fallback
      alert(`PDF generation failed. An HTML file has been saved instead. You can open it and use "Print to PDF" (${navigator.platform.includes('Mac') ? 'Cmd+P' : 'Ctrl+P'}) to save as PDF.`);
    }
    throw error;
  }
};

