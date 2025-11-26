import { Trash2, MousePointer2, MessageSquare } from 'lucide-react';
import { SelectedElement } from '../types';
import { SelectionMode } from './SelectionModeToggle';

interface SelectedItemsListProps {
  items: SelectedElement[];
  selectionMode: SelectionMode;
  onRemove: (id: string) => void;
}

export const SelectedItemsList = ({ items, selectionMode, onRemove }: SelectedItemsListProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center text-gray-400 py-4 text-sm">
        {selectionMode === 'conversation' ? (
          <>
            <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
            <p className="font-medium mb-1">Select Entire Conversation</p>
            <p className="text-xs">
              Hover over any message and click once to capture the full chat from first prompt to last response.
            </p>
            <p className="text-xs mt-2 text-gray-500">
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
          className="bg-gray-50 p-2 rounded text-xs flex justify-between items-start group border border-transparent hover:border-blue-200"
        >
          <div className="truncate flex-1 pr-2">
            <span className="font-mono font-bold text-blue-600 text-[10px] uppercase mr-2">
              {el.tagName}
            </span>
            <span
              className="text-gray-600 inline truncate max-w-[150px] align-bottom"
              title={el.content.substring(0, 200)}
            >
              {el.content.replace(/<[^>]*>?/gm, '').substring(0, 60)}...
            </span>
          </div>
          <button
            onClick={() => onRemove(el.id)}
            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
};

