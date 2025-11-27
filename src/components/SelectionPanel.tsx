import { X, Check, Loader2 } from "lucide-react";
import { SelectedElement, SelectionMode, ExportFormat, Theme } from "../types";
import { SelectionModeToggle } from "./SelectionModeToggle";
import { SelectedItemsList } from "./SelectedItemsList";
import { ExportMenu } from "./ExportMenu";

interface SelectionPanelProps {
  isActive: boolean;
  selectionMode: SelectionMode;
  selectedElements: SelectedElement[];
  isExporting: boolean;
  exportProgress: string;
  showExportMenu: boolean;
  theme: Theme;
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
  theme,
  onClose,
  onModeChange,
  onRemoveElement,
  onClearAll,
  onDoneSelecting,
  onResumeSelecting,
  onToggleExportMenu,
  onExport,
}: SelectionPanelProps) => {
  const isDark = theme === "dark" || theme === "midnight";

  return (
    <div
      className={`fixed bottom-4 right-4 z-[10001] shadow-2xl rounded-lg w-80 overflow-visible flex flex-col max-h-[500px] pointer-events-auto font-sans transition-colors ${
        isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200"
      }`}
    >
      {/* Header */}
      <div
        className={`p-3 border-b flex justify-between items-center rounded-t-lg ${
          isDark ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-blue-500"}`}
          />
          <h3 className={`font-semibold text-sm ${isDark ? "text-slate-100" : "text-gray-900"}`}>
            {isActive
              ? selectionMode === "conversation"
                ? "Selecting Conversations..."
                : "Selecting Elements..."
              : "Ready to Export"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded ${
            isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"
          }`}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Mode Toggle */}
      {isActive && (
        <SelectionModeToggle mode={selectionMode} onModeChange={onModeChange} theme={theme} />
      )}

      {/* Content Area */}
      <div
        className={`p-3 flex-1 overflow-y-auto min-h-[100px] max-h-[300px] ${
          isDark ? "bg-slate-800" : "bg-white"
        }`}
      >
        <SelectedItemsList
          items={selectedElements}
          selectionMode={selectionMode}
          onRemove={onRemoveElement}
          theme={theme}
        />
      </div>

      {/* Footer */}
      <div
        className={`p-3 border-t flex flex-col gap-2 rounded-b-lg relative ${
          isDark ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200"
        }`}
      >
        {/* Loading Overlay */}
        {isExporting && (
          <div
            className={`absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-b-lg ${
              isDark ? "bg-slate-900/90" : "bg-white/90"
            }`}
          >
            <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
            <span
              className={`text-xs font-medium text-center px-4 ${
                isDark ? "text-slate-300" : "text-gray-600"
              }`}
            >
              {exportProgress || "Processing..."}
            </span>
          </div>
        )}

        {/* Item Count & Clear */}
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {selectedElements.length} items selected
          </span>
          <button
            className="text-xs text-red-500 hover:text-red-400 font-medium"
            onClick={onClearAll}
            disabled={selectedElements.length === 0 || isExporting}
          >
            Clear All
          </button>
        </div>

        {/* Action Buttons */}
        {isActive ? (
          <button
            className={`w-full py-2 rounded text-sm font-medium flex items-center justify-center gap-2 ${
              isDark
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-800 text-white hover:bg-slate-900"
            }`}
            onClick={onDoneSelecting}
          >
            <Check size={16} />
            Done Selecting
          </button>
        ) : (
          <div className="flex gap-2 relative">
            <button
              className={`flex-1 py-2 border rounded text-sm font-medium ${
                isDark
                  ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              onClick={onResumeSelecting}
            >
              Resume
            </button>
            <ExportMenu
              isOpen={showExportMenu}
              onToggle={onToggleExportMenu}
              onExport={onExport}
              disabled={selectedElements.length === 0}
              theme={theme}
            />
          </div>
        )}
      </div>
    </div>
  );
};
