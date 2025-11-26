/**
 * Element filtering and style enhancement for exports
 */

import { SelectedElement } from '../types';
import { fixCodeBlocks } from './codeBlocks';

/**
 * Selectors for UI elements that should be removed from exports
 */
const UI_SELECTORS_TO_REMOVE = [
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

/**
 * Text patterns for footer disclaimer elements
 */
const FOOTER_PATTERNS = [
  /^ChatGPT can make mistakes\.?\s*Check important info\.?$/i,
  /^Claude can make mistakes\.?\s*Please double-check/i,
];

/**
 * UI aria-labels that indicate elements should be removed
 */
const UI_ARIA_LABELS = [
  'Copy', 'Edit message', 'Good response', 'Bad response', 
  'More actions', 'Share', 'Model selector'
];

/**
 * Filter out common header/footer UI elements that shouldn't be in exports
 */
export const filterNonConversationElements = (container: HTMLElement): void => {
  // Remove elements by selector
  UI_SELECTORS_TO_REMOVE.forEach(selector => {
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
  UI_ARIA_LABELS.forEach(label => {
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
      for (const pattern of FOOTER_PATTERNS) {
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

/**
 * Apply computed styles as inline styles recursively
 */
const applyComputedStyles = (el: HTMLElement): void => {
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

/**
 * Enhance element HTML with stored computed styles or find original element
 */
export const enhanceElementWithStyles = (element: SelectedElement): string => {
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

