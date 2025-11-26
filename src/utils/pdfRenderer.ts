/**
 * PDF Renderer - Renders content blocks to PDF with native text
 */

import jsPDF from 'jspdf';
import { ContentBlock, TextRun } from './pdfContentParser';
import {
  LayoutState,
  LinkAnnotation,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_TOP,
  CONTENT_WIDTH,
  FONT_SIZE_BODY,
  FONT_SIZE_CODE,
  FONT_SIZE_H1,
  FONT_SIZE_H2,
  FONT_SIZE_H3,
  FONT_SIZE_H4,
  FONT_SIZE_H5,
  FONT_SIZE_H6,
  LINE_HEIGHT_FACTOR,
  PARAGRAPH_SPACING,
  HEADING_SPACING_BEFORE,
  HEADING_SPACING_AFTER,
  CODE_BLOCK_PADDING,
  CODE_BLOCK_MARGIN,
  LIST_INDENT,
  MESSAGE_PADDING,
  MESSAGE_MARGIN,
  ptToMm,
  wrapText,
  wrapCodeText,
  measureBlock,
  needsNewPage,
  addNewPage,
  isLightColor,
  setPdfFillColor,
  setPdfTextColor,
  setPdfDrawColor,
} from './pdfLayout';
import { highlightCode } from './syntaxHighlighting';

/**
 * Render context passed to all render functions
 */
interface RenderContext {
  pdf: jsPDF;
  state: LayoutState;
  maxWidth: number;
  x: number;
  baseTextColor: string;
  baseBgColor: string;
}

/**
 * Render text runs with formatting
 */
const renderTextRuns = (
  ctx: RenderContext,
  runs: TextRun[],
  fontSize: number,
  isBoldBase: boolean = false
): number => {
  const { pdf, state, maxWidth, x } = ctx;
  const lineHeight = ptToMm(fontSize) * LINE_HEIGHT_FACTOR;
  let y = state.currentY;

  // Combine all runs to get full text for wrapping
  const fullText = runs.map(r => r.text).join('');
  const lines = wrapText(pdf, fullText, maxWidth, fontSize, isBoldBase ? 'bold' : 'normal');

  // Track position within runs for styling
  let runIndex = 0;
  let runOffset = 0;
  let globalOffset = 0;

  for (const line of lines) {
    // Check for page break
    if (needsNewPage(y, lineHeight)) {
      y = addNewPage(pdf, state);
    }

    // Render each character with its styling
    let lineX = x;
    let charIndex = 0;

    while (charIndex < line.length) {
      // Find current run
      while (runIndex < runs.length && runOffset >= runs[runIndex].text.length) {
        runOffset = 0;
        runIndex++;
      }

      if (runIndex >= runs.length) break;

      const currentRun = runs[runIndex];
      const remainingInRun = currentRun.text.length - runOffset;
      const remainingInLine = line.length - charIndex;
      const chunkLength = Math.min(remainingInRun, remainingInLine);

      // Get the text chunk
      const chunk = line.substring(charIndex, charIndex + chunkLength);

      // Apply styling
      const fontStyle = currentRun.bold || isBoldBase ? 'bold' : currentRun.italic ? 'italic' : 'normal';
      pdf.setFont('helvetica', fontStyle);
      pdf.setFontSize(fontSize);

      // Set color
      if (currentRun.color) {
        setPdfTextColor(pdf, currentRun.color);
      } else {
        setPdfTextColor(pdf, ctx.baseTextColor);
      }

      // Handle inline code
      if (currentRun.code) {
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(fontSize - 1);
        // Draw background for inline code
        const codeWidth = pdf.getTextWidth(chunk);
        const bgColor = isLightColor(ctx.baseBgColor) ? '#f0f0f0' : '#2d2d2d';
        setPdfFillColor(pdf, bgColor);
        pdf.rect(lineX - 0.5, y - ptToMm(fontSize - 1) * 0.8, codeWidth + 1, lineHeight * 0.9, 'F');
        setPdfTextColor(pdf, isLightColor(ctx.baseBgColor) ? '#d63384' : '#e879f9');
      }

      // Render text
      pdf.text(chunk, lineX, y);

      // Track link for annotation
      if (currentRun.link) {
        const linkWidth = pdf.getTextWidth(chunk);
        state.links.push({
          page: state.pageNumber,
          x: lineX,
          y: y - lineHeight * 0.7,
          width: linkWidth,
          height: lineHeight,
          url: currentRun.link
        });

        // Draw underline for links
        setPdfDrawColor(pdf, currentRun.color || '#3b82f6');
        pdf.setLineWidth(0.2);
        pdf.line(lineX, y + 0.5, lineX + linkWidth, y + 0.5);
      }

      // Move position
      lineX += pdf.getTextWidth(chunk);
      charIndex += chunkLength;
      runOffset += chunkLength;
      globalOffset += chunkLength;

      // Handle whitespace that might have been collapsed
      if (charIndex < line.length && line[charIndex] === ' ') {
        lineX += pdf.getTextWidth(' ');
        charIndex++;
        globalOffset++;
        runOffset++;
      }
    }

    y += lineHeight;
  }

  // Reset text color
  setPdfTextColor(pdf, ctx.baseTextColor);

  return y;
};

/**
 * Render a code block with syntax highlighting using canvas
 */
const renderCodeBlock = async (
  ctx: RenderContext,
  block: ContentBlock
): Promise<number> => {
  const { pdf, state, maxWidth, x } = ctx;
  const code = block.code || '';
  const language = block.language || '';
  const bgColor = block.backgroundColor || '#1e1e1e';

  // Calculate dimensions
  const codeWidth = maxWidth;
  const innerWidth = codeWidth - CODE_BLOCK_PADDING * 2;
  const lines = wrapCodeText(pdf, code, innerWidth, FONT_SIZE_CODE);
  const lineHeight = ptToMm(FONT_SIZE_CODE) * LINE_HEIGHT_FACTOR;
  const contentHeight = lines.length * lineHeight;
  const totalHeight = contentHeight + CODE_BLOCK_PADDING * 2;

  // Check for page break
  let y = state.currentY;
  if (needsNewPage(y, totalHeight + CODE_BLOCK_MARGIN * 2)) {
    y = addNewPage(pdf, state);
  }

  y += CODE_BLOCK_MARGIN;

  // Draw background with rounded corners
  setPdfFillColor(pdf, bgColor);
  const radius = 2;
  pdf.roundedRect(x, y, codeWidth, totalHeight, radius, radius, 'F');

  // Draw language badge
  if (language) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setPdfTextColor(pdf, '#6b7280');
    const badgeX = x + codeWidth - CODE_BLOCK_PADDING - pdf.getTextWidth(language);
    pdf.text(language, badgeX, y + 5);
  }

  // Render code text
  const textX = x + CODE_BLOCK_PADDING;
  let textY = y + CODE_BLOCK_PADDING + ptToMm(FONT_SIZE_CODE) * 0.8;

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_SIZE_CODE);
  setPdfTextColor(pdf, '#d4d4d4'); // Default code color

  // Apply syntax highlighting if we have a language
  if (language && code) {
    // Get highlighted HTML
    const highlightedHtml = highlightCode(code, language);
    
    // Parse the highlighted HTML to extract colors
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${highlightedHtml}</div>`, 'text/html');
    
    // Map character positions to colors
    const colorMap: Map<number, string> = new Map();
    let pos = 0;
    
    const extractColors = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        pos += text.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const style = el.getAttribute('style') || '';
        const colorMatch = style.match(/color:\s*([^;]+)/);
        const color = colorMatch ? colorMatch[1].trim() : null;
        
        if (color) {
          const startPos = pos;
          el.childNodes.forEach(child => extractColors(child));
          // Mark this range with the color
          for (let i = startPos; i < pos; i++) {
            colorMap.set(i, color);
          }
        } else {
          el.childNodes.forEach(child => extractColors(child));
        }
      }
    };
    
    doc.body.firstChild?.childNodes.forEach(child => extractColors(child));

    // Render lines with colors
    let charPos = 0;
    for (const line of lines) {
      // Handle page break within code block
      if (needsNewPage(textY, lineHeight)) {
        textY = addNewPage(pdf, state);
        // Redraw background on new page
        const remainingLines = lines.slice(lines.indexOf(line));
        const remainingHeight = remainingLines.length * lineHeight + CODE_BLOCK_PADDING * 2;
        setPdfFillColor(pdf, bgColor);
        pdf.roundedRect(x, textY - CODE_BLOCK_PADDING, codeWidth, remainingHeight, radius, radius, 'F');
        textY += CODE_BLOCK_PADDING;
      }

      let lineX = textX;
      let currentColor = '#d4d4d4';
      let currentChunk = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charColor = colorMap.get(charPos + i) || '#d4d4d4';

        if (charColor !== currentColor && currentChunk) {
          // Render previous chunk
          setPdfTextColor(pdf, currentColor);
          pdf.text(currentChunk, lineX, textY);
          lineX += pdf.getTextWidth(currentChunk);
          currentChunk = '';
        }

        currentColor = charColor;
        currentChunk += char;
      }

      // Render final chunk
      if (currentChunk) {
        setPdfTextColor(pdf, currentColor);
        pdf.text(currentChunk, lineX, textY);
      }

      textY += lineHeight;
      charPos += line.length + 1; // +1 for newline
    }
  } else {
    // No syntax highlighting - just render plain text
    for (const line of lines) {
      // Handle page break
      if (needsNewPage(textY, lineHeight)) {
        textY = addNewPage(pdf, state);
        const remainingLines = lines.slice(lines.indexOf(line));
        const remainingHeight = remainingLines.length * lineHeight + CODE_BLOCK_PADDING * 2;
        setPdfFillColor(pdf, bgColor);
        pdf.roundedRect(x, textY - CODE_BLOCK_PADDING, codeWidth, remainingHeight, radius, radius, 'F');
        textY += CODE_BLOCK_PADDING;
      }

      pdf.text(line, textX, textY);
      textY += lineHeight;
    }
  }

  // Reset text color
  setPdfTextColor(pdf, ctx.baseTextColor);

  return textY + CODE_BLOCK_MARGIN;
};

/**
 * Render a list
 */
const renderList = (
  ctx: RenderContext,
  block: ContentBlock,
  depth: number = 0
): number => {
  const { pdf, state, maxWidth, x } = ctx;
  const indent = LIST_INDENT * (depth + 1);
  const bulletX = x + indent - 4;
  const textX = x + indent;
  const textWidth = maxWidth - indent;
  const lineHeight = ptToMm(FONT_SIZE_BODY) * LINE_HEIGHT_FACTOR;

  let y = state.currentY;
  let itemNumber = 1;

  if (!block.items) return y;

  for (const item of block.items) {
    if (item.type === 'list') {
      // Nested list
      state.currentY = y;
      const nestedCtx = { ...ctx, maxWidth: textWidth, x: textX };
      y = renderList(nestedCtx, item, depth + 1);
    } else if (item.runs) {
      // Check for page break
      const itemHeight = lineHeight * 2; // Estimate
      if (needsNewPage(y, itemHeight)) {
        y = addNewPage(pdf, state);
      }

      // Draw bullet or number
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZE_BODY);
      setPdfTextColor(pdf, ctx.baseTextColor);

      if (block.ordered) {
        pdf.text(`${itemNumber}.`, bulletX, y);
        itemNumber++;
      } else {
        // Unicode bullet
        pdf.text('•', bulletX, y);
      }

      // Render item text
      const itemCtx = { ...ctx, maxWidth: textWidth, x: textX };
      state.currentY = y;
      y = renderTextRuns(itemCtx, item.runs, FONT_SIZE_BODY);
      y += PARAGRAPH_SPACING / 2;
    }
  }

  return y;
};

/**
 * Render a blockquote
 */
const renderBlockquote = (ctx: RenderContext, block: ContentBlock): number => {
  const { pdf, state, maxWidth, x } = ctx;
  const quoteIndent = 6;
  const quoteX = x + quoteIndent;
  const quoteWidth = maxWidth - quoteIndent;
  const lineHeight = ptToMm(FONT_SIZE_BODY) * LINE_HEIGHT_FACTOR;

  let y = state.currentY;

  if (!block.runs) return y;

  // Calculate height for border
  const fullText = block.runs.map(r => r.text).join('');
  const lines = wrapText(pdf, fullText, quoteWidth, FONT_SIZE_BODY);
  const height = lines.length * lineHeight + PARAGRAPH_SPACING;

  // Check for page break
  if (needsNewPage(y, height)) {
    y = addNewPage(pdf, state);
  }

  // Draw left border
  setPdfDrawColor(pdf, '#6b7280');
  pdf.setLineWidth(1);
  pdf.line(x + 2, y - 2, x + 2, y + height - PARAGRAPH_SPACING);

  // Render text with italic styling
  const quoteCtx = { ...ctx, maxWidth: quoteWidth, x: quoteX };
  state.currentY = y;
  
  // Make quote text slightly muted
  const originalColor = ctx.baseTextColor;
  setPdfTextColor(pdf, '#9ca3af');
  
  pdf.setFont('helvetica', 'italic');
  y = renderTextRuns(quoteCtx, block.runs, FONT_SIZE_BODY);
  
  setPdfTextColor(pdf, originalColor);
  
  return y + PARAGRAPH_SPACING;
};

/**
 * Render a horizontal rule
 */
const renderHorizontalRule = (ctx: RenderContext): number => {
  const { pdf, state, maxWidth, x } = ctx;
  
  let y = state.currentY + 4;
  
  if (needsNewPage(y, 8)) {
    y = addNewPage(pdf, state) + 4;
  }

  setPdfDrawColor(pdf, '#4b5563');
  pdf.setLineWidth(0.3);
  pdf.line(x, y, x + maxWidth, y);

  return y + 4;
};

/**
 * Render an image
 */
const renderImage = async (ctx: RenderContext, block: ContentBlock): Promise<number> => {
  const { pdf, state, maxWidth, x } = ctx;
  
  if (!block.src) return state.currentY;

  let y = state.currentY;

  try {
    // Load image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = block.src!;
    });

    // Calculate dimensions
    const aspectRatio = img.height / img.width;
    let imgWidth = Math.min(maxWidth, img.width * 0.264583); // px to mm
    let imgHeight = imgWidth * aspectRatio;

    // Limit max height
    const maxImgHeight = 150;
    if (imgHeight > maxImgHeight) {
      imgHeight = maxImgHeight;
      imgWidth = imgHeight / aspectRatio;
    }

    // Check for page break
    if (needsNewPage(y, imgHeight + PARAGRAPH_SPACING)) {
      y = addNewPage(pdf, state);
    }

    // Center the image if it's smaller than max width
    const imgX = x + (maxWidth - imgWidth) / 2;

    // Add image to PDF
    pdf.addImage(img, 'PNG', imgX, y, imgWidth, imgHeight);

    return y + imgHeight + PARAGRAPH_SPACING;
  } catch (error) {
    console.warn('Failed to render image:', error);
    // Show placeholder text
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    setPdfTextColor(pdf, '#9ca3af');
    pdf.text('[Image could not be loaded]', x, y + 5);
    return y + 10;
  }
};

/**
 * Render a message block (user or assistant)
 */
const renderMessage = async (
  ctx: RenderContext,
  block: ContentBlock,
  contentBlocks: ContentBlock[]
): Promise<number> => {
  const { pdf, state, maxWidth, x } = ctx;
  const isUser = block.role === 'user';
  
  // User messages get a bubble style
  if (isUser && block.styles?.backgroundColor) {
    const bgColor = block.styles.backgroundColor;
    const textColor = block.styles.color || '#ffffff';
    
    // Calculate content height
    let contentHeight = MESSAGE_PADDING * 2;
    const innerWidth = maxWidth - MESSAGE_PADDING * 2 - (isUser ? 40 : 0);
    
    // Measure nested content
    for (const contentBlock of contentBlocks) {
      const measured = measureBlock(pdf, contentBlock, innerWidth);
      contentHeight += measured.height;
    }

    let y = state.currentY + MESSAGE_MARGIN;

    // Check for page break
    if (needsNewPage(y, contentHeight)) {
      y = addNewPage(pdf, state);
    }

    // Draw bubble background (right-aligned for user)
    const bubbleWidth = Math.min(maxWidth * 0.7, innerWidth + MESSAGE_PADDING * 2);
    const bubbleX = isUser ? x + maxWidth - bubbleWidth : x;
    
    setPdfFillColor(pdf, bgColor);
    pdf.roundedRect(bubbleX, y, bubbleWidth, contentHeight, 3, 3, 'F');

    // Render content inside bubble
    const innerCtx = {
      ...ctx,
      x: bubbleX + MESSAGE_PADDING,
      maxWidth: bubbleWidth - MESSAGE_PADDING * 2,
      baseTextColor: textColor
    };
    
    let innerY = y + MESSAGE_PADDING;
    
    for (const contentBlock of contentBlocks) {
      state.currentY = innerY;
      innerY = await renderContentBlock(innerCtx, contentBlock);
    }

    return Math.max(innerY, y + contentHeight) + MESSAGE_MARGIN;
  }

  // Assistant messages - just render content normally with a subtle indicator
  let y = state.currentY + MESSAGE_MARGIN;
  
  for (const contentBlock of contentBlocks) {
    state.currentY = y;
    y = await renderContentBlock(ctx, contentBlock);
  }

  return y + MESSAGE_MARGIN;
};

/**
 * Render a single content block
 */
export const renderContentBlock = async (
  ctx: RenderContext,
  block: ContentBlock
): Promise<number> => {
  const { pdf, state } = ctx;

  switch (block.type) {
    case 'paragraph': {
      if (block.runs && block.runs.length > 0) {
        const y = renderTextRuns(ctx, block.runs, FONT_SIZE_BODY);
        return y + PARAGRAPH_SPACING;
      }
      return state.currentY;
    }

    case 'heading': {
      const fontSizes = [FONT_SIZE_H1, FONT_SIZE_H2, FONT_SIZE_H3, FONT_SIZE_H4, FONT_SIZE_H5, FONT_SIZE_H6];
      const fontSize = fontSizes[(block.level || 1) - 1] || FONT_SIZE_BODY;
      
      let y = state.currentY + HEADING_SPACING_BEFORE;
      
      // Check for page break - don't break right before a heading
      if (needsNewPage(y, ptToMm(fontSize) * LINE_HEIGHT_FACTOR + HEADING_SPACING_AFTER)) {
        y = addNewPage(pdf, state);
      }

      state.currentY = y;
      
      if (block.runs && block.runs.length > 0) {
        y = renderTextRuns(ctx, block.runs, fontSize, true);
      }
      
      return y + HEADING_SPACING_AFTER;
    }

    case 'code-block': {
      return await renderCodeBlock(ctx, block);
    }

    case 'list': {
      return renderList(ctx, block);
    }

    case 'blockquote': {
      return renderBlockquote(ctx, block);
    }

    case 'horizontal-rule': {
      return renderHorizontalRule(ctx);
    }

    case 'image': {
      return await renderImage(ctx, block);
    }

    case 'user-message':
    case 'assistant-message': {
      // Get the next blocks that belong to this message
      // This is handled by the main render function
      return state.currentY;
    }

    default:
      return state.currentY;
  }
};

/**
 * Add link annotations to the PDF
 */
export const addLinkAnnotations = (pdf: jsPDF, links: LinkAnnotation[]): void => {
  for (const link of links) {
    // jsPDF uses page index (0-based), our pageNumber is 1-based
    pdf.setPage(link.page);
    pdf.link(link.x, link.y, link.width, link.height, { url: link.url });
  }
};

/**
 * Main render function - renders all content blocks to PDF
 */
export const renderContentToPdf = async (
  pdf: jsPDF,
  blocks: ContentBlock[],
  bgColor: string,
  textColor: string
): Promise<void> => {
  const state: LayoutState = {
    currentY: MARGIN_TOP,
    pageNumber: 1,
    links: []
  };

  const ctx: RenderContext = {
    pdf,
    state,
    maxWidth: CONTENT_WIDTH,
    x: MARGIN_LEFT,
    baseTextColor: textColor,
    baseBgColor: bgColor
  };

  // Fill first page background
  setPdfFillColor(pdf, bgColor);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  // Track message context for grouping
  let currentMessageBlocks: ContentBlock[] = [];
  let currentMessageBlock: ContentBlock | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Handle message grouping
    if (block.type === 'user-message' || block.type === 'assistant-message') {
      // Render any pending message
      if (currentMessageBlock && currentMessageBlocks.length > 0) {
        state.currentY = await renderMessage(ctx, currentMessageBlock, currentMessageBlocks);
      }
      
      currentMessageBlock = block;
      currentMessageBlocks = [];
      continue;
    }

    // If we're in a message context, collect blocks
    if (currentMessageBlock) {
      currentMessageBlocks.push(block);
      continue;
    }

    // Regular block - render directly
    state.currentY = await renderContentBlock(ctx, block);

    // Check if we need to fill new page background
    const currentPage = state.pageNumber;
    if (currentPage > pdf.getNumberOfPages() - 1) {
      // We've added a new page, need to fill its background
      // (This is handled in addNewPage, but double-check)
    }
  }

  // Render any remaining message
  if (currentMessageBlock && currentMessageBlocks.length > 0) {
    state.currentY = await renderMessage(ctx, currentMessageBlock, currentMessageBlocks);
  }

  // Fill all page backgrounds (do this after content to ensure all pages exist)
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    setPdfFillColor(pdf, bgColor);
    // Draw background behind everything
    // Note: jsPDF doesn't have z-ordering, so backgrounds are drawn first during page creation
  }

  // Add link annotations
  addLinkAnnotations(pdf, state.links);
};

