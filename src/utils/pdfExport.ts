/**
 * PDF generation and export - Hybrid approach with native text rendering
 * 
 * Features:
 * - Selectable/searchable text
 * - Clickable links
 * - Smart page breaks
 * - Syntax-highlighted code blocks
 * - Smaller file sizes compared to image-only approach
 * - High visual quality
 */

import { SelectedElement } from '../types';
import jsPDF from 'jspdf';
import { getDocumentBackgroundColor, parseColor } from './styles';
import { enhanceElementWithStyles } from './elementProcessing';
import { downloadBlobWithPicker } from './download';
import { generateExportHTML } from './htmlExport';
import { parseHTMLToContentBlocks, flattenContentBlocks, ContentBlock } from './pdfContentParser';
import { renderContentToPdf } from './pdfRenderer';
import { isLightColor } from './pdfLayout';

/**
 * Generate a PDF blob from selected elements using native text rendering
 */
export const generateExportPDF = async (elements: SelectedElement[]): Promise<Blob> => {
  if (!elements || elements.length === 0) {
    throw new Error('No elements selected for export');
  }

  console.log('PDF Export: Starting with', elements.length, 'elements');

  // Get document colors
  const bgColor = getDocumentBackgroundColor();
  const textColor = isLightColor(bgColor) ? '#1f2937' : '#f3f4f6';

  console.log('PDF Export: Using background:', bgColor, 'text:', textColor);

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  try {
    // Enhance and parse elements to content blocks
    const allBlocks: ContentBlock[] = [];

    for (const element of elements) {
      try {
        // Enhance element with computed styles
        const enhancedHtml = enhanceElementWithStyles(element);
        
        // Parse to content blocks
        const blocks = parseHTMLToContentBlocks(enhancedHtml);
        allBlocks.push(...blocks);
      } catch (err) {
        console.warn('PDF Export: Error processing element:', err);
        // Try with raw content as fallback
        const blocks = parseHTMLToContentBlocks(element.content);
        allBlocks.push(...blocks);
      }
    }

    console.log('PDF Export: Parsed', allBlocks.length, 'content blocks');

    if (allBlocks.length === 0) {
      throw new Error('No content parsed from selected elements');
    }

    // Flatten message blocks for rendering
    const flattenedBlocks = flattenContentBlocks(allBlocks);
    console.log('PDF Export: Flattened to', flattenedBlocks.length, 'blocks');

    // Render content to PDF
    await renderContentToPdf(pdf, flattenedBlocks, bgColor, textColor);

    console.log('PDF Export: Rendered', pdf.getNumberOfPages(), 'pages');

    // Generate blob
    const pdfBlob = pdf.output('blob');
    
    console.log('PDF Export: Generated blob of size', (pdfBlob.size / 1024).toFixed(1), 'KB');
    
    return pdfBlob;
  } catch (error) {
    console.error('PDF Export: Native rendering failed, falling back to image mode:', error);
    // Fall back to the legacy image-based approach
    return await generateLegacyPDF(elements);
  }
};

/**
 * Legacy image-based PDF generation (fallback)
 */
const generateLegacyPDF = async (elements: SelectedElement[]): Promise<Blob> => {
  const html2canvas = (await import('html2canvas')).default;
  
  // Create a temporary container for rendering
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.top = '0';
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '794px';
  tempContainer.style.maxWidth = '794px';
  tempContainer.style.minHeight = '100px';
  tempContainer.style.padding = '40px';
  tempContainer.style.backgroundColor = 'transparent';
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.zIndex = '-9999';
  tempContainer.style.overflow = 'visible';
  tempContainer.style.height = 'auto';
  tempContainer.style.display = 'block';
  document.body.appendChild(tempContainer);

  try {
    // Enhance elements with computed styles
    const enhancedContent = elements.map((el) => {
      try {
        return enhanceElementWithStyles(el);
      } catch (err) {
        console.warn('Error enhancing element for PDF:', err);
        return el.content || '';
      }
    }).filter(content => content && content.trim().length > 0).join('\n');

    if (!enhancedContent || enhancedContent.trim().length === 0) {
      throw new Error('No content generated from selected elements');
    }

    // Get document background color
    const bgColor = getDocumentBackgroundColor();

    tempContainer.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        .ai-chat-export-item { margin-bottom: 20px; }
        pre { overflow: visible !important; white-space: pre-wrap !important; word-wrap: break-word !important; }
        code { white-space: pre-wrap; word-wrap: break-word; font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; }
      </style>
      <div class="ai-chat-export-item">${enhancedContent}</div>
    `;

    // Force reflow
    void tempContainer.offsetHeight;

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    const contentHeight = tempContainer.scrollHeight;

    // Move container into view for html2canvas
    tempContainer.style.left = '0';
    tempContainer.style.visibility = 'visible';

    // Render to canvas
    const canvas = await html2canvas(tempContainer, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 794,
      windowHeight: Math.max(contentHeight + 100, window.innerHeight),
      height: contentHeight + 50,
    });

    // Move container off-screen
    tempContainer.style.left = '-9999px';
    tempContainer.style.visibility = 'hidden';

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Failed to capture content - canvas is empty');
    }

    // Create PDF from canvas
    const [r, g, b] = parseColor(bgColor);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, 210, pageHeight, 'F');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, 210, pageHeight, 'F');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  } finally {
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
