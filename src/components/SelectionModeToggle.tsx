import { MousePointer2, MessageSquare } from 'lucide-react';

export type SelectionMode = 'element' | 'conversation';

interface SelectionModeToggleProps {
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
}

export const SelectionModeToggle = ({ mode, onModeChange }: SelectionModeToggleProps) => {
  return (
    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex gap-2">
      <button
        onClick={() => onModeChange('element')}
        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
          mode === 'element'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }`}
        title="Select individual elements"
      >
        <MousePointer2 size={12} />
        Element
      </button>
      <button
        onClick={() => onModeChange('conversation')}
        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
          mode === 'conversation'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }`}
        title="Select entire conversations"
      >
        <MessageSquare size={12} />
        Conversation
      </button>
    </div>
  );
};

