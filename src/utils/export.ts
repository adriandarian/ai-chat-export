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
    
    // Recursively apply computed styles as inline styles
    const applyComputedStyles = (el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      const inlineStyle = el.getAttribute('style') || '';
      
          // Important visual properties to preserve
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
            display: computed.display,
            flexDirection: computed.flexDirection,
            gap: computed.gap,
            width: computed.width,
            maxWidth: computed.maxWidth,
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
  
  // Final fallback: return original content
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
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
    /* But allow specific elements to maintain scroll behavior if needed */
    .ai-chat-export-item pre,
    .ai-chat-export-item code {
      overflow-x: auto !important;
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
    // Remove overflow constraints from scrollable elements
    document.querySelectorAll('[style*="overflow"]').forEach(el => {
      el.style.overflow = 'visible';
      el.style.overflowY = 'visible';
      el.style.maxHeight = 'none';
      el.style.height = 'auto';
    });
  </script>
</body>
</html>`;
};

export const downloadBlob = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
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
        pre, code {
          white-space: pre-wrap;
          word-wrap: break-word;
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

export const downloadPDF = async (elements: SelectedElement[], filename: string) => {
  try {
    const blob = await generateExportPDF(elements);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('PDF generation failed:', error);
    // Fallback: Generate HTML and let user print to PDF
    const html = generateExportHTML(elements);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show alert to user
    alert(`PDF generation failed. An HTML file has been downloaded instead. You can open it and use "Print to PDF" (${navigator.platform.includes('Mac') ? 'Cmd+P' : 'Ctrl+P'}) to save as PDF.`);
    throw error;
  }
};

