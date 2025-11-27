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
 * - jsonExport.ts: JSON export
 * - download.ts: File download utilities
 * - languageDetection.ts: Code language detection
 * - messageRoles.ts: User/assistant message detection
 * - conversationDetection.ts: Chat container detection and collection
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
} from './syntaxHighlighting';

// Language detection
export {
  KNOWN_LANGUAGES,
  isKnownLanguage,
  detectLanguage,
  detectLanguageFromElement,
  cleanCodeContent,
  extractCodeContent,
} from './languageDetection';

// Message role detection
export {
  isUserMessage,
  isAssistantMessage,
  detectMessageRole,
  guessRoleFromContent,
} from './messageRoles';

// Conversation detection
export {
  findConversationContainer,
  findScrollableElement,
  collectFullConversation,
} from './conversationDetection';

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

// JSON export
export {
  generateExportJSON,
  generateSimpleExportJSON,
} from './jsonExport';

// Download utilities
export {
  downloadBlob,
  downloadBlobWithPicker,
} from './download';
