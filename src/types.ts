/**
 * Core types for the AI Chat Export extension
 */

// =============================================================================
// Export Formats
// =============================================================================

export type ExportFormat = "html" | "pdf" | "json" | "markdown";

// =============================================================================
// Theme
// =============================================================================

export type Theme = "light" | "dark" | "midnight";

// =============================================================================
// Selection
// =============================================================================

export type SelectionMode = "element" | "conversation";

export interface SelectedElement {
  id: string;
  originalId: string;
  tagName: string;
  className: string;
  xpath: string;
  content: string; // InnerHTML or text
  computedStyles?: { [key: string]: string }; // Store computed styles for better export
}

// =============================================================================
// Message Types (for JSON export and content parsing)
// =============================================================================

export type MessageRole = "user" | "assistant";

export interface TextContent {
  type: "text";
  content: string;
}

export interface CodeBlockContent {
  type: "code";
  language: string;
  content: string;
}

export interface ListContent {
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface ImageContent {
  type: "image";
  src: string;
  alt: string;
}

export interface LinkContent {
  type: "link";
  text: string;
  url: string;
}

export type MessageContent =
  | TextContent
  | CodeBlockContent
  | ListContent
  | ImageContent
  | LinkContent;

export interface MessageData {
  role: MessageRole;
  content: MessageContent[];
  timestamp?: string;
}

export interface Exchange {
  prompt: {
    content: MessageContent[];
    timestamp?: string;
  };
  response: {
    content: MessageContent[];
    timestamp?: string;
  };
  metadata?: {
    index: number;
  };
}

export interface ChatExport {
  exportedAt: string;
  source: string;
  exchanges: Exchange[];
  metadata?: {
    totalExchanges: number;
    exportVersion: string;
  };
}

// =============================================================================
// Chrome Extension Messages
// =============================================================================

export type Message =
  | { type: "TOGGLE_SELECTION_MODE"; payload?: boolean }
  | { type: "CLEAR_SELECTION" }
  | { type: "GET_SELECTION_STATUS" };
