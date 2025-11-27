/**
 * PDF generation and export - Optimized for speed
 * 
 * Uses html2canvas with optimized settings for fast rendering.
 */

import { SelectedElement } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getPageStyles, parseColor } from './styles';
import { enhanceElementWithStyles } from './elementProcessing';
import { fixCodeBlocks } from './codeBlocks';
import { downloadBlobWithPicker } from './download';
import { generateExportHTML } from './htmlExport';

// PDF dimensions
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const RENDER_WIDTH_PX = 800;
const RENDER_SCALE = 1.5; // Lower scale = faster, 1.5 is good balance

/**
 * Minimal styles for PDF rendering - skip heavy CSS processing
 */
const getMinimalStyles = (): string => `
  * { box-sizing: border-box; }
  body, html { margin: 0; padding: 0; }
  .pdf-content {
    width: ${RENDER_WIDTH_PX}px;
    padding: 32px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    overflow: visible !important;
  }
  img { max-width: 100%; height: auto; }
  pre, code {
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: visible !important;
  }
  pre {
    padding: 12px;
    border-radius: 6px;
    margin: 8px 0;
  }
`;

/**
 * Get background color quickly
 */
const getBackgroundColor = (): string => {
  const bg = window.getComputedStyle(document.body).backgroundColor;
  return (bg && bg !== 'rgba(0, 0, 0, 0)') ? bg : '#212121';
};

/**
 * Generate PDF blob - optimized for speed
 */
export const generateExportPDF = async (elements: SelectedElement[]): Promise<Blob> => {
  if (!elements || elements.length === 0) {
    throw new Error('No elements selected');
  }

  const startTime = performance.now();
  console.log('PDF: Starting export...');

  // Create off-screen container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: ${RENDER_WIDTH_PX}px;
    background: transparent;
    visibility: hidden;
  `;
  document.body.appendChild(container);

  try {
    // Get styles and background
    const pageStyles = getPageStyles();
    const bgColor = getBackgroundColor();
    
    // Enhance elements quickly
    const contents = elements.map(el => {
      try {
        return enhanceElementWithStyles(el);
      } catch {
        return el.content || '';
      }
    }).filter(c => c.trim()).join('\n');

    if (!contents) throw new Error('No content');

    // Build render HTML
    container.innerHTML = `
      <style>${getMinimalStyles()}</style>
      ${pageStyles}
      <div class="pdf-content">${contents}</div>
    `;

    // Quick code block fix
    fixCodeBlocks(container);

    // Minimal wait - just for DOM to settle
    await new Promise(r => setTimeout(r, 50));

    const contentEl = container.querySelector('.pdf-content') as HTMLElement;
    const contentHeight = contentEl.scrollHeight;
    
    console.log('PDF: Content ready, height:', contentHeight, 'px');

    // Make visible for capture
    container.style.visibility = 'visible';

    // Render to canvas with optimized settings
    const canvas = await html2canvas(contentEl, {
      backgroundColor: bgColor,
      scale: RENDER_SCALE,
      useCORS: true,
      allowTaint: true,
      logging: false,
      // Disable slow features
      foreignObjectRendering: false,
      removeContainer: false,
      // Set exact dimensions
      width: RENDER_WIDTH_PX,
      height: contentHeight,
      windowWidth: RENDER_WIDTH_PX,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
    });

    container.style.visibility = 'hidden';

    if (!canvas || canvas.width === 0) {
      throw new Error('Canvas capture failed');
    }

    console.log('PDF: Canvas captured:', canvas.width, 'x', canvas.height);

    // Create PDF
    const [r, g, b] = parseColor(bgColor);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92); // JPEG is faster than PNG
    const imgWidth = PAGE_WIDTH_MM;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    let pageNum = 0;

    while (heightLeft > 0) {
      if (pageNum > 0) pdf.addPage();
      
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, 'F');
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      
      heightLeft -= PAGE_HEIGHT_MM;
      position = heightLeft - imgHeight;
      pageNum++;
    }

    const blob = pdf.output('blob');
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    console.log(`PDF: Done! ${pageNum} pages, ${(blob.size/1024).toFixed(0)}KB in ${elapsed}s`);

    return blob;

  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Download PDF file
 */
export const downloadPDF = async (elements: SelectedElement[], filename: string): Promise<void> => {
  try {
    const blob = await generateExportPDF(elements);
    await downloadBlobWithPicker(blob, filename, 'PDF Document', { 'application/pdf': ['.pdf'] });
  } catch (error) {
    console.error('PDF export failed:', error);
    
    // Fallback to HTML
    try {
      const html = generateExportHTML(elements);
      const blob = new Blob([html], { type: 'text/html' });
      const saved = await downloadBlobWithPicker(
        blob,
        filename.replace('.pdf', '.html'),
        'HTML Document',
        { 'text/html': ['.html'] }
      );
      if (saved) {
        alert('PDF failed. HTML saved instead - use Print > Save as PDF');
      }
    } catch {
      alert('Export failed. Try HTML or Markdown format.');
    }
  }
};
