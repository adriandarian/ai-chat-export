import { Trash2, MousePointer2, MessageSquare } from 'lucide-react';
import { SelectedElement, SelectionMode, Theme } from '../types';

interface SelectedItemsListProps {
  items: SelectedElement[];
  selectionMode: SelectionMode;
  onRemove: (id: string) => void;
  theme?: Theme;
}

export const SelectedItemsList = ({ items, selectionMode, onRemove, theme = 'light' }: SelectedItemsListProps) => {
  const isDark = theme === 'dark' || theme === 'midnight';
  
  if (items.length === 0) {
    return (
      <div className={`text-center py-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
        {selectionMode === 'conversation' ? (
          <>
            <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
            <p className="font-medium mb-1">Select Entire Conversation</p>
            <p className="text-xs">
              Hover over any message and click once to capture the full chat from first prompt to last response.
            </p>
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
              This will capture everything, even if it spans hundreds of pages.
            </p>
          </>
        ) : (
          <>
            <MousePointer2 className="mx-auto mb-2 opacity-50" size={24} />
            <p>Hover and click elements to select them individually.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((el) => (
        <li
          key={el.id}
          className={`p-2 rounded text-xs flex justify-between items-start group border ${
            isDark 
              ? 'bg-slate-700/50 border-transparent hover:border-blue-500/50' 
              : 'bg-gray-50 border-transparent hover:border-blue-200'
          }`}
        >
          <div className="truncate flex-1 pr-2">
            <span className="font-mono font-bold text-blue-500 text-[10px] uppercase mr-2">
              {el.tagName}
            </span>
            <span
              className={`inline truncate max-w-[150px] align-bottom ${
                isDark ? 'text-slate-300' : 'text-gray-600'
              }`}
              title={el.content.substring(0, 200)}
            >
              {el.content.replace(/<[^>]*>?/gm, '').substring(0, 60)}...
            </span>
          </div>
          <button
            onClick={() => onRemove(el.id)}
            className={`hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${
              isDark ? 'text-slate-500' : 'text-gray-400'
            }`}
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
};
