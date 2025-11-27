interface HoverRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SelectionOverlayProps {
  isVisible: boolean;
  rect: HoverRect | null;
}

export const SelectionOverlay = ({ isVisible, rect }: SelectionOverlayProps) => {
  if (!isVisible || !rect) return null;

  return (
    <div
      className="fixed pointer-events-none z-[10000] border-2 border-blue-500 bg-blue-500/10 transition-all duration-75 ease-out rounded-sm"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
};
