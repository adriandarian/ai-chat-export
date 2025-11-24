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

// Get computed styles for an element and its children
const getComputedStylesForElement = (element: HTMLElement): string => {
  const styles: string[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const computed = window.getComputedStyle(el);
      const tagName = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const classes = el.className && typeof el.className === 'string' 
        ? `.${el.className.split(' ').filter(c => c).join('.')}` 
        : '';
      
      // Create a unique selector
      const selector = `${tagName}${id}${classes}`.replace(/\s+/g, '');
      if (selector) {
        const styleRules: string[] = [];
        
        // Capture important visual properties
        const importantProps = [
          'color', 'background-color', 'background', 'font-family', 'font-size',
          'font-weight', 'line-height', 'padding', 'margin', 'border',
          'border-radius', 'display', 'flex-direction', 'gap', 'width', 'height',
          'max-width', 'min-width', 'text-align', 'opacity', 'box-shadow',
          'transform', 'position', 'top', 'left', 'right', 'bottom', 'z-index'
        ];
        
        importantProps.forEach(prop => {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'normal' && value !== 'auto') {
            styleRules.push(`  ${prop}: ${value};`);
          }
        });
        
        if (styleRules.length > 0) {
          styles.push(`[data-export-id="${el.getAttribute('data-export-id') || ''}"] {`);
          styles.push(...styleRules);
          styles.push('}');
        }
      }
    }
    node = walker.nextNode();
  }
  
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Chat Export</title>
      <base href="${window.location.origin}">
      ${styles}
      <style>
        :root {
          /* Preserve CSS variables from the original page */
        }
        * {
          box-sizing: border-box;
        }
        body { 
          padding: 40px; 
          max-width: 1200px; 
          margin: 0 auto; 
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          /* Don't force background - preserve original */
        }
        .ai-chat-export-item {
          position: relative;
          margin-bottom: 30px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .ai-chat-export-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        /* Preserve original styling - don't force white background */
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
      <h1 style="font-family: system-ui, -apple-system, sans-serif; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        Chat Export - ${new Date().toLocaleDateString()}
      </h1>
      <div class="ai-chat-export-item">
        ${enhancedContent}
      </div>
      <script>
        // Fix image sources to use absolute URLs
        document.querySelectorAll('img').forEach(img => {
          if (img.src && !img.src.startsWith('http')) {
            const absoluteUrl = new URL(img.src, window.location.href).href;
            img.src = absoluteUrl;
          }
        });
      </script>
    </body>
    </html>
  `;
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

export const generateExportPDF = async (elements: SelectedElement[]): Promise<Blob> => {
  // Create a temporary container for rendering
  // Use visibility hidden instead of off-screen positioning for html2canvas
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '0';
  tempContainer.style.left = '0';
  tempContainer.style.width = '210mm'; // A4 width
  tempContainer.style.maxWidth = '210mm';
  tempContainer.style.minHeight = '100px'; // Ensure minimum height
  tempContainer.style.padding = '40px';
  tempContainer.style.visibility = 'hidden';
  tempContainer.style.opacity = '0';
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.zIndex = '-9999';
  tempContainer.style.overflow = 'visible';
  tempContainer.style.display = 'block';
  // Don't force white background - preserve original
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
      const rootStyles = window.getComputedStyle(document.documentElement);
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
      <h1 style="font-family: system-ui, -apple-system, sans-serif; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        Chat Export - ${new Date().toLocaleDateString()}
      </h1>
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

    // Make container briefly visible for html2canvas (it needs to be in the render tree)
    tempContainer.style.visibility = 'visible';
    tempContainer.style.opacity = '1';
    
    // Force a reflow to ensure rendering
    void tempContainer.offsetHeight;

    // Wait for images and fonts to load
    await new Promise(resolve => setTimeout(resolve, 2000));

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
    const canvas = await html2canvas(tempContainer, {
      backgroundColor: finalBgColor,
      scale: 2,
      useCORS: true,
      logging: true, // Enable logging to debug
      allowTaint: true,
      foreignObjectRendering: true,
      removeContainer: false,
      onclone: (clonedDoc, element) => {
        // Make sure the cloned element is visible
        const clonedContainer = clonedDoc.querySelector('.ai-chat-export-item');
        if (clonedContainer) {
          (clonedContainer as HTMLElement).style.display = 'block';
          (clonedContainer as HTMLElement).style.visibility = 'visible';
          (clonedContainer as HTMLElement).style.opacity = '1';
        }
        // Ensure the main container is visible in clone
        if (element instanceof HTMLElement) {
          element.style.visibility = 'visible';
          element.style.opacity = '1';
        }
      },
    });

    // Hide container again
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.opacity = '0';

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Failed to capture content - canvas is empty');
    }

    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
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

