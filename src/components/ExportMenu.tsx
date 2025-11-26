import { FileDown, ChevronDown, Code, FileText, FileType, FileJson } from 'lucide-react';

export type ExportFormat = 'html' | 'pdf' | 'json' | 'markdown';

interface ExportMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
}

export const ExportMenu = ({ isOpen, onToggle, onExport, disabled }: ExportMenuProps) => {
  return (
    <div className="flex-1 relative">
      <button
        className="w-full py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onToggle}
      >
        <FileDown size={16} />
        Export
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
          <button
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
            onClick={() => onExport('html')}
          >
            <Code size={14} className="text-blue-500" />
            Export as HTML
          </button>
          <button
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
            onClick={() => onExport('pdf')}
          >
            <FileText size={14} className="text-red-500" />
            Export as PDF
          </button>
          <button
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
            onClick={() => onExport('markdown')}
          >
            <FileType size={14} className="text-purple-500" />
            Export as Markdown
          </button>
          <button
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
            onClick={() => onExport('json')}
          >
            <FileJson size={14} className="text-amber-500" />
            Export as JSON
          </button>
        </div>
      )}
    </div>
  );
};

