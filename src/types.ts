export type ExportFormat = 'pdf' | 'html' | 'docx';

export type Message =
  | { type: 'TOGGLE_SELECTION_MODE'; payload?: boolean }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'GET_SELECTION_STATUS' };

export interface SelectedElement {
  id: string;
  originalId: string;
  tagName: string;
  className: string;
  xpath: string;
  content: string; // InnerHTML or text
}

