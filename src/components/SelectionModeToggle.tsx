import { MousePointer2, MessageSquare } from "lucide-react";
import { SelectionMode, Theme } from "../types";

interface SelectionModeToggleProps {
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  theme?: Theme;
}

export const SelectionModeToggle = ({
  mode,
  onModeChange,
  theme = "light",
}: SelectionModeToggleProps) => {
  const isDark = theme === "dark" || theme === "midnight";

  return (
    <div
      className={`px-3 py-2 border-b flex gap-2 ${
        isDark ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-100"
      }`}
    >
      <button
        onClick={() => onModeChange("element")}
        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
          mode === "element"
            ? "bg-blue-600 text-white shadow-sm"
            : isDark
              ? "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
        }`}
        title="Select individual elements"
      >
        <MousePointer2 size={12} />
        Element
      </button>
      <button
        onClick={() => onModeChange("conversation")}
        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
          mode === "conversation"
            ? "bg-blue-600 text-white shadow-sm"
            : isDark
              ? "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
        }`}
        title="Select entire conversations"
      >
        <MessageSquare size={12} />
        Conversation
      </button>
    </div>
  );
};
