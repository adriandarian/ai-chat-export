/**
 * HTML export generation
 */

import { SelectedElement } from "../types";
import { getPageStyles, getDocumentBackgroundColor } from "./styles";
import { enhanceElementWithStyles } from "./elementProcessing";

/**
 * Generate the inline script for client-side code block processing
 * This is included in the exported HTML file
 */
const getClientSideScript = (): string => `
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
`;

/**
 * Generate the CSS styles for the exported HTML
 */
const getExportStyles = (bgColor: string): string => `
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
`;

/**
 * Generate a complete HTML document for export
 */
export const generateExportHTML = (elements: SelectedElement[]): string => {
  const styles = getPageStyles();
  const bgColor = getDocumentBackgroundColor();

  // Enhance elements with computed styles
  const enhancedContent = elements
    .map((el) => {
      try {
        return enhanceElementWithStyles(el);
      } catch (err) {
        console.warn("Error enhancing element:", err);
        return el.content;
      }
    })
    .join("\n");

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
  <style>${getExportStyles(bgColor)}</style>
</head>
<body>
  <div class="ai-chat-export-wrapper">
    <div class="ai-chat-export-item">
      ${enhancedContent}
    </div>
  </div>
  <script>${getClientSideScript()}</script>
</body>
</html>`;
};
