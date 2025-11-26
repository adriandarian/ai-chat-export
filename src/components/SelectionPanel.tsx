import { X, Check, Loader2 } from 'lucide-react';
import { SelectedElement } from '../types';
import { SelectionModeToggle, SelectionMode } from './SelectionModeToggle';
import { SelectedItemsList } from './SelectedItemsList';
import { ExportMenu, ExportFormat } from './ExportMenu';

interface SelectionPanelProps {
  isActive: boolean;
  selectionMode: SelectionMode;
  selectedElements: SelectedElement[];
  isExporting: boolean;
  exportProgress: string;
  showExportMenu: boolean;
  onClose: () => void;
  onModeChange: (mode: SelectionMode) => void;
  onRemoveElement: (id: string) => void;
  onClearAll: () => void;
  onDoneSelecting: () => void;
  onResumeSelecting: () => void;
  onToggleExportMenu: () => void;
  onExport: (format: ExportFormat) => void;
}

export const SelectionPanel = ({
  isActive,
  selectionMode,
  selectedElements,
  isExporting,
  exportProgress,
  showExportMenu,
  onClose,
  onModeChange,
  onRemoveElement,
  onClearAll,
  onDoneSelecting,
  onResumeSelecting,
  onToggleExportMenu,
  onExport,
}: SelectionPanelProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-[10001] bg-white shadow-2xl rounded-lg border border-gray-200 w-80 overflow-visible flex flex-col max-h-[500px] pointer-events-auto font-sans">
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
          <h3 className="font-semibold text-sm">
            {isActive
              ? selectionMode === 'conversation'
                ? 'Selecting Conversations...'
                : 'Selecting Elements...'
              : 'Ready to Export'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded text-gray-500"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Mode Toggle */}
      {isActive && (
        <SelectionModeToggle mode={selectionMode} onModeChange={onModeChange} />
      )}

      {/* Content Area */}
      <div className="p-3 flex-1 overflow-y-auto min-h-[100px] max-h-[300px] bg-white">
        <SelectedItemsList
          items={selectedElements}
          selectionMode={selectionMode}
          onRemove={onRemoveElement}
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex flex-col gap-2 rounded-b-lg relative">
        {/* Loading Overlay */}
        {isExporting && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-b-lg">
            <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
            <span className="text-xs text-gray-600 font-medium text-center px-4">
              {exportProgress || 'Processing...'}
            </span>
          </div>
        )}

        {/* Item Count & Clear */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">
            {selectedElements.length} items selected
          </span>
          <button
            className="text-xs text-red-500 hover:text-red-700 font-medium"
            onClick={onClearAll}
            disabled={selectedElements.length === 0 || isExporting}
          >
            Clear All
          </button>
        </div>

        {/* Action Buttons */}
        {isActive ? (
          <button
            className="w-full py-2 bg-slate-800 text-white rounded text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-2"
            onClick={onDoneSelecting}
          >
            <Check size={16} />
            Done Selecting
          </button>
        ) : (
          <div className="flex gap-2 relative">
            <button
              className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
              onClick={onResumeSelecting}
            >
              Resume
            </button>
            <ExportMenu
              isOpen={showExportMenu}
              onToggle={onToggleExportMenu}
              onExport={onExport}
              disabled={selectedElements.length === 0}
            />
          </div>
        )}
      </div>
    </div>
  );
};

