/**
 * PDF Layout Engine - Handles page layout, positioning, and smart page breaks
 */

import jsPDF from 'jspdf';
import { ContentBlock, TextRun } from './pdfContentParser';

// PDF dimensions in mm (A4)
export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const MARGIN_LEFT = 20;
export const MARGIN_RIGHT = 20;
export const MARGIN_TOP = 25;
export const MARGIN_BOTTOM = 25;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
export const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Typography settings (in points)
export const FONT_SIZE_BODY = 11;
export const FONT_SIZE_CODE = 9;
export const FONT_SIZE_H1 = 22;
export const FONT_SIZE_H2 = 18;
export const FONT_SIZE_H3 = 15;
export const FONT_SIZE_H4 = 13;
export const FONT_SIZE_H5 = 12;
export const FONT_SIZE_H6 = 11;
export const LINE_HEIGHT_FACTOR = 1.5;

// Spacing (in mm)
export const PARAGRAPH_SPACING = 4;
export const HEADING_SPACING_BEFORE = 8;
export const HEADING_SPACING_AFTER = 4;
export const CODE_BLOCK_PADDING = 8;
export const CODE_BLOCK_MARGIN = 6;
export const LIST_INDENT = 8;
export const MESSAGE_PADDING = 10;
export const MESSAGE_MARGIN = 8;

/**
 * Convert points to mm
 */
export const ptToMm = (pt: number): number => pt * 0.352778;

/**
 * Convert mm to points
 */
export const mmToPt = (mm: number): number => mm / 0.352778;

/**
 * Layout state for tracking position across pages
 */
export interface LayoutState {
  currentY: number;
  pageNumber: number;
  links: LinkAnnotation[];
}

/**
 * Link annotation for PDF
 */
export interface LinkAnnotation {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

/**
 * Measured content block with calculated dimensions
 */
export interface MeasuredBlock {
  block: ContentBlock;
  height: number; // in mm
  canBreak: boolean; // Whether this block can be split across pages
  minHeight?: number; // Minimum height if breaking (e.g., first line)
}

/**
 * Calculate text width in mm
 */
export const measureTextWidth = (pdf: jsPDF, text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal'): number => {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', fontStyle);
  return pdf.getTextWidth(text);
};

/**
 * Wrap text to fit within a maximum width, returns lines
 */
export const wrapText = (pdf: jsPDF, text: string, maxWidth: number, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic' = 'normal'): string[] => {
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', fontStyle);
  
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = pdf.getTextWidth(testLine);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
};

/**
 * Wrap code text preserving line breaks
 */
export const wrapCodeText = (pdf: jsPDF, code: string, maxWidth: number, fontSize: number): string[] => {
  pdf.setFontSize(fontSize);
  pdf.setFont('courier', 'normal');
  
  const inputLines = code.split('\n');
  const outputLines: string[] = [];

  for (const line of inputLines) {
    if (!line) {
      outputLines.push('');
      continue;
    }

    // Check if line fits
    const lineWidth = pdf.getTextWidth(line);
    if (lineWidth <= maxWidth) {
      outputLines.push(line);
    } else {
      // Need to wrap - try to break at reasonable points
      let remaining = line;
      while (remaining) {
        let breakPoint = remaining.length;
        
        // Find where to break
        for (let i = remaining.length; i > 0; i--) {
          const substr = remaining.substring(0, i);
          if (pdf.getTextWidth(substr) <= maxWidth) {
            breakPoint = i;
            break;
          }
        }

        // Try to break at whitespace or punctuation
        const chunk = remaining.substring(0, breakPoint);
        const lastSpace = Math.max(
          chunk.lastIndexOf(' '),
          chunk.lastIndexOf(','),
          chunk.lastIndexOf(';'),
          chunk.lastIndexOf('('),
          chunk.lastIndexOf('{'),
          chunk.lastIndexOf('[')
        );
        
        if (lastSpace > breakPoint * 0.5) {
          breakPoint = lastSpace + 1;
        }

        outputLines.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint);
      }
    }
  }

  return outputLines;
};

/**
 * Calculate height needed for text runs
 */
export const measureTextRuns = (pdf: jsPDF, runs: TextRun[], maxWidth: number, fontSize: number): number => {
  // Combine runs to get full text, then wrap
  const fullText = runs.map(r => r.text).join('');
  const lines = wrapText(pdf, fullText, maxWidth, fontSize);
  const lineHeight = ptToMm(fontSize) * LINE_HEIGHT_FACTOR;
  return lines.length * lineHeight;
};

/**
 * Calculate height needed for a code block
 */
export const measureCodeBlock = (pdf: jsPDF, code: string, maxWidth: number): number => {
  const codeWidth = maxWidth - (CODE_BLOCK_PADDING * 2);
  const lines = wrapCodeText(pdf, code, codeWidth, FONT_SIZE_CODE);
  const lineHeight = ptToMm(FONT_SIZE_CODE) * LINE_HEIGHT_FACTOR;
  return (lines.length * lineHeight) + (CODE_BLOCK_PADDING * 2) + (CODE_BLOCK_MARGIN * 2);
};

/**
 * Measure a content block's height
 */
export const measureBlock = (pdf: jsPDF, block: ContentBlock, maxWidth: number): MeasuredBlock => {
  let height = 0;
  let canBreak = false;
  let minHeight: number | undefined;

  switch (block.type) {
    case 'paragraph': {
      if (block.runs && block.runs.length > 0) {
        height = measureTextRuns(pdf, block.runs, maxWidth, FONT_SIZE_BODY);
        height += PARAGRAPH_SPACING;
        canBreak = true;
        minHeight = ptToMm(FONT_SIZE_BODY) * LINE_HEIGHT_FACTOR;
      }
      break;
    }

    case 'heading': {
      const fontSize = [FONT_SIZE_H1, FONT_SIZE_H2, FONT_SIZE_H3, FONT_SIZE_H4, FONT_SIZE_H5, FONT_SIZE_H6][block.level! - 1] || FONT_SIZE_BODY;
      if (block.runs && block.runs.length > 0) {
        height = measureTextRuns(pdf, block.runs, maxWidth, fontSize);
        height += HEADING_SPACING_BEFORE + HEADING_SPACING_AFTER;
      }
      // Headings shouldn't break - keep with following content
      canBreak = false;
      break;
    }

    case 'code-block': {
      if (block.code) {
        height = measureCodeBlock(pdf, block.code, maxWidth);
        // Code blocks can break if very long
        canBreak = height > CONTENT_HEIGHT * 0.5;
        minHeight = CODE_BLOCK_PADDING * 2 + ptToMm(FONT_SIZE_CODE) * LINE_HEIGHT_FACTOR * 3;
      }
      break;
    }

    case 'list': {
      const listWidth = maxWidth - LIST_INDENT;
      if (block.items) {
        for (const item of block.items) {
          if (item.type === 'list') {
            // Nested list
            const nestedMeasured = measureBlock(pdf, item, listWidth);
            height += nestedMeasured.height;
          } else if (item.runs) {
            height += measureTextRuns(pdf, item.runs, listWidth, FONT_SIZE_BODY);
            height += PARAGRAPH_SPACING / 2;
          }
        }
      }
      canBreak = true;
      minHeight = ptToMm(FONT_SIZE_BODY) * LINE_HEIGHT_FACTOR * 2;
      break;
    }

    case 'blockquote': {
      if (block.runs && block.runs.length > 0) {
        const quoteWidth = maxWidth - LIST_INDENT;
        height = measureTextRuns(pdf, block.runs, quoteWidth, FONT_SIZE_BODY);
        height += PARAGRAPH_SPACING;
      }
      canBreak = true;
      break;
    }

    case 'horizontal-rule': {
      height = 8;
      break;
    }

    case 'image': {
      // Estimate image height - will be calculated more precisely during render
      if (block.width && block.height) {
        const aspectRatio = block.height / block.width;
        const imgWidth = Math.min(maxWidth, block.width * 0.264583); // px to mm
        height = imgWidth * aspectRatio + PARAGRAPH_SPACING;
      } else {
        height = 50; // Default estimate
      }
      break;
    }

    case 'user-message':
    case 'assistant-message': {
      // Message containers have padding
      height = MESSAGE_PADDING * 2 + MESSAGE_MARGIN;
      if (block.items) {
        for (const item of block.items) {
          const itemMeasured = measureBlock(pdf, item, maxWidth - MESSAGE_PADDING * 2);
          height += itemMeasured.height;
        }
      }
      canBreak = true;
      minHeight = MESSAGE_PADDING * 2 + ptToMm(FONT_SIZE_BODY) * LINE_HEIGHT_FACTOR;
      break;
    }

    default:
      height = 0;
  }

  return { block, height, canBreak, minHeight };
};

/**
 * Check if we need a new page
 */
export const needsNewPage = (currentY: number, contentHeight: number): boolean => {
  return currentY + contentHeight > PAGE_HEIGHT - MARGIN_BOTTOM;
};

/**
 * Get available space on current page
 */
export const getAvailableSpace = (currentY: number): number => {
  return PAGE_HEIGHT - MARGIN_BOTTOM - currentY;
};

/**
 * Add a new page and return the new Y position
 */
export const addNewPage = (pdf: jsPDF, state: LayoutState): number => {
  pdf.addPage();
  state.pageNumber++;
  return MARGIN_TOP;
};

/**
 * Smart page break - decides whether to break or move to next page
 */
export const smartPageBreak = (
  pdf: jsPDF, 
  state: LayoutState, 
  measured: MeasuredBlock
): number => {
  const available = getAvailableSpace(state.currentY);

  // If it fits, no problem
  if (measured.height <= available) {
    return state.currentY;
  }

  // If block can't break or is small enough to fit on a new page, move to new page
  if (!measured.canBreak || measured.height <= CONTENT_HEIGHT) {
    return addNewPage(pdf, state);
  }

  // Block is too tall for a single page and can break
  // Stay on current page, let the render function handle breaking
  return state.currentY;
};

/**
 * Parse RGB color string to components
 */
export const parseRgbColor = (color: string): { r: number; g: number; b: number } | null => {
  // Handle rgb/rgba format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    };
  }
  
  // Handle hex format
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
  }

  return null;
};

/**
 * Check if a color is light (for determining text contrast)
 */
export const isLightColor = (color: string): boolean => {
  const rgb = parseRgbColor(color);
  if (!rgb) return true; // Default to light if can't parse
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
};

/**
 * Set PDF fill color from CSS color string
 */
export const setPdfFillColor = (pdf: jsPDF, color: string): void => {
  const rgb = parseRgbColor(color);
  if (rgb) {
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  }
};

/**
 * Set PDF text color from CSS color string
 */
export const setPdfTextColor = (pdf: jsPDF, color: string): void => {
  const rgb = parseRgbColor(color);
  if (rgb) {
    pdf.setTextColor(rgb.r, rgb.g, rgb.b);
  }
};

/**
 * Set PDF draw color from CSS color string
 */
export const setPdfDrawColor = (pdf: jsPDF, color: string): void => {
  const rgb = parseRgbColor(color);
  if (rgb) {
    pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
  }
};

