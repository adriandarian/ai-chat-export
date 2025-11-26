/**
 * Page style extraction and CSS handling utilities
 */

/**
 * Extract all stylesheets and inline styles from the current page
 */
export const getPageStyles = (): string => {
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

/**
 * Extract CSS variables from the document's stylesheets
 */
export const extractCSSVariables = (): string[] => {
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
  return cssVariables;
};

/**
 * Get the background color from the document
 */
export const getDocumentBackgroundColor = (): string => {
  const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
  const htmlBgColor = window.getComputedStyle(document.documentElement).backgroundColor;
  const bgColor = (bodyBgColor && bodyBgColor !== 'rgba(0, 0, 0, 0)') 
    ? bodyBgColor 
    : (htmlBgColor && htmlBgColor !== 'rgba(0, 0, 0, 0)') 
      ? htmlBgColor 
      : '#ffffff';
  return bgColor;
};

/**
 * Parse CSS color string to RGB values
 */
export const parseColor = (color: string): [number, number, number] => {
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

