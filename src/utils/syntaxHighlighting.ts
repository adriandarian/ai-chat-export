/**
 * Simple syntax highlighting for common programming languages
 */

/**
 * Apply syntax highlighting to code content
 * @param code - The code string to highlight
 * @param language - The programming language
 * @returns HTML string with syntax highlighting spans
 */
export const highlightCode = (code: string, language: string): string => {
  // Escape HTML first
  let escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lang = language.toLowerCase();

  // JSON highlighting - match ChatGPT's color scheme
  if (lang === "json") {
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
  else if (lang === "javascript" || lang === "js" || lang === "typescript" || lang === "ts") {
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
      .replace(
        /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/g,
        '<span style="color: #ce9178;">$1</span>',
      )
      // Keywords
      .replace(
        /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g,
        '<span style="color: #569cd6;">$1</span>',
      )
      // Numbers (but not inside words)
      .replace(/(?<![a-zA-Z_])\b(\d+\.?\d*)\b/g, '<span style="color: #b5cea8;">$1</span>');

    // Restore comments with highlighting
    escaped = escaped.replace(/__COMMENT_(\d+)__/g, (_, index) => {
      return `<span style="color: #6a9955;">${commentPlaceholders[parseInt(index)]}</span>`;
    });
  }
  // Python highlighting
  else if (lang === "python" || lang === "py") {
    // Protect comments first
    const pyComments: string[] = [];
    escaped = escaped.replace(/(#.*$)/gm, (match) => {
      pyComments.push(match);
      return `__PYCOMMENT_${pyComments.length - 1}__`;
    });

    escaped = escaped
      // Strings
      .replace(
        /("""[\s\S]*?"""|'''[\s\S]*?'''|"([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g,
        '<span style="color: #ce9178;">$1</span>',
      )
      // Keywords
      .replace(
        /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|raise|with|lambda|True|False|None|and|or|not|in|is)\b/g,
        '<span style="color: #569cd6;">$1</span>',
      )
      // Numbers
      .replace(/(?<![a-zA-Z_])\b(\d+\.?\d*)\b/g, '<span style="color: #b5cea8;">$1</span>');

    // Restore comments with highlighting
    escaped = escaped.replace(/__PYCOMMENT_(\d+)__/g, (_, index) => {
      return `<span style="color: #6a9955;">${pyComments[parseInt(index)]}</span>`;
    });
  }
  // Bash/Shell highlighting
  else if (lang === "bash" || lang === "sh" || lang === "shell" || lang === "zsh") {
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
  else if (lang === "html" || lang === "xml" || lang === "svg") {
    escaped = escaped
      // Tags
      .replace(/(&lt;\/?[\w-]+)/g, '<span style="color: #569cd6;">$1</span>')
      // Attributes
      .replace(/(\s[\w-]+)=/g, '<span style="color: #9cdcfe;">$1</span>=')
      // Strings
      .replace(/"([^"]*)"/g, '"<span style="color: #ce9178;">$1</span>"');
  }
  // CSS highlighting
  else if (lang === "css" || lang === "scss" || lang === "less") {
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

// Re-export KNOWN_LANGUAGES from the centralized location
export { KNOWN_LANGUAGES } from "./languageDetection";
