/**
 * PDF generation and export
 */

import { SelectedElement } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getPageStyles, extractCSSVariables, parseColor } from './styles';
import { enhanceElementWithStyles } from './elementProcessing';
import { fixCodeBlocks } from './codeBlocks';
import { downloadBlobWithPicker } from './download';
import { generateExportHTML } from './htmlExport';

/**
 * Generate a PDF blob from selected elements
 */
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
    const cssVariables = extractCSSVariables();

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

/**
 * Generate and download a PDF file
 */
export const downloadPDF = async (elements: SelectedElement[], filename: string): Promise<void> => {
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

