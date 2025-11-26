/**
 * Export utilities - main entry point
 * 
 * This module re-exports all export-related functionality from specialized modules:
 * - styles.ts: Page style extraction and CSS handling
 * - syntaxHighlighting.ts: Code syntax highlighting
 * - codeBlocks.ts: Code block processing and rebuilding
 * - elementProcessing.ts: Element filtering and style enhancement
 * - htmlExport.ts: HTML generation
 * - markdownExport.ts: Markdown conversion
 * - pdfExport.ts: PDF generation
 * - pdfContentParser.ts: PDF content parsing
 * - pdfLayout.ts: PDF layout calculations
 * - pdfRenderer.ts: PDF rendering
 * - download.ts: File download utilities
 */

// Style utilities
export {
  getPageStyles,
  extractCSSVariables,
  getDocumentBackgroundColor,
  parseColor,
} from './styles';

// Syntax highlighting
export {
  highlightCode,
  KNOWN_LANGUAGES,
} from './syntaxHighlighting';

// Code block processing
export {
  rebuildCodeBlocks,
  fixCodeBlocks,
} from './codeBlocks';

// Element processing
export {
  filterNonConversationElements,
  enhanceElementWithStyles,
} from './elementProcessing';

// HTML export
export {
  generateExportHTML,
} from './htmlExport';

// Markdown export
export {
  htmlToMarkdown,
  generateExportMarkdown,
} from './markdownExport';

// PDF export
export {
  generateExportPDF,
  downloadPDF,
} from './pdfExport';

// PDF content parsing
export {
  parseHTMLToContentBlocks,
  parseSelectedElements,
  flattenContentBlocks,
} from './pdfContentParser';

// PDF layout
export {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
} from './pdfLayout';

// PDF rendering
export {
  renderContentToPdf,
} from './pdfRenderer';

// Download utilities
export {
  downloadBlob,
  downloadBlobWithPicker,
} from './download';
