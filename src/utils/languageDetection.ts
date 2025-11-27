/**
 * Language detection utilities for code blocks
 * 
 * Consolidates all language detection logic used across export formats.
 */

/**
 * Known programming languages for code detection
 */
export const KNOWN_LANGUAGES = [
  'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java', 'c', 'cpp', 
  'csharp', 'cs', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
  'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'markdown', 'md',
  'sql', 'bash', 'sh', 'shell', 'zsh', 'powershell', 'dockerfile', 'makefile',
  'plaintext', 'text', 'diff', 'graphql', 'toml', 'ini', 'env', 'jsx', 'tsx', 'svg'
] as const;

export type KnownLanguage = typeof KNOWN_LANGUAGES[number];

/**
 * Check if a string is a known programming language
 */
export const isKnownLanguage = (lang: string): lang is KnownLanguage => {
  return KNOWN_LANGUAGES.includes(lang.toLowerCase() as KnownLanguage);
};

/**
 * Detect language from element classes and attributes
 */
export const detectLanguageFromElement = (element: Element): string => {
  // Check for language- or lang- class patterns
  const className = element.className?.toString() || '';
  const langMatch = className.match(/language-(\w+)|lang-(\w+)|hljs\s+(\w+)/);
  if (langMatch) {
    return langMatch[1] || langMatch[2] || langMatch[3] || '';
  }
  
  // Check data-language attribute
  const dataLang = element.getAttribute('data-language');
  if (dataLang) return dataLang;
  
  return '';
};

/**
 * Check element class hierarchy for language hints
 */
const checkClassHierarchy = (element: Element | null): string => {
  if (!element) return '';
  
  let lang = detectLanguageFromElement(element);
  if (lang) return lang;
  
  // Check code child if this is a pre
  const codeEl = element.querySelector('code');
  if (codeEl) {
    lang = detectLanguageFromElement(codeEl);
    if (lang) return lang;
  }
  
  // Check parent wrapper
  const wrapper = element.closest('[class*="code"], [data-language]');
  if (wrapper && wrapper !== element) {
    lang = detectLanguageFromElement(wrapper);
    if (lang) return lang;
  }
  
  return '';
};

/**
 * Detect language from a code block element (pre or code-wrapper)
 * This is the main function to use when processing code blocks.
 */
export const detectLanguage = (preElement: HTMLElement, codeElement?: HTMLElement | null): string => {
  // Check the pre element and its hierarchy
  let language = checkClassHierarchy(preElement);
  if (language) return language;
  
  // Check the code element if provided
  if (codeElement) {
    language = checkClassHierarchy(codeElement);
    if (language) return language;
  }
  
  // Check for language label in nearby elements (ChatGPT puts it in a span)
  const codeBlockWrapper = preElement.closest('[class*="code"]') || preElement.parentElement;
  if (codeBlockWrapper) {
    const langSpan = codeBlockWrapper.querySelector('span');
    if (langSpan && langSpan.textContent && langSpan.textContent.length < 20) {
      const potentialLang = langSpan.textContent.toLowerCase().trim();
      if (isKnownLanguage(potentialLang)) {
        return potentialLang;
      }
    }
  }
  
  return '';
};

/**
 * Clean code content by removing toolbar artifacts
 * Common across ChatGPT and other AI chat interfaces
 */
export const cleanCodeContent = (text: string): string => {
  return text
    .replace(/^[\s]*Copy code[\s]*/i, '')
    .replace(/^[\s]*Copy[\s]*/i, '')
    .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*Copy code[\s]*/i, '')
    .replace(/^(json|javascript|js|python|py|bash|sh|html|css|typescript|ts|java|cpp?|go|rust|sql|yaml|xml|shell|plaintext)[\s]*$/im, '')
    .trim();
};

/**
 * Extract clean code content from a pre element
 */
export const extractCodeContent = (preElement: HTMLElement): string => {
  const codeEl = preElement.querySelector('code');
  let textContent = '';
  
  if (codeEl) {
    textContent = codeEl.textContent || '';
  } else {
    // Clone and remove toolbar elements before getting text
    const clone = preElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, [class*="copy"], [class*="toolbar"], [class*="header"]').forEach(el => el.remove());
    textContent = clone.textContent || '';
  }
  
  return cleanCodeContent(textContent);
};

