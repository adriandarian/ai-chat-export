import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SelectionOverlay } from "./SelectionOverlay";

describe("SelectionOverlay", () => {
  const defaultRect = {
    top: 100,
    left: 200,
    width: 300,
    height: 150,
  };

  describe("visibility", () => {
    it("should not render when isVisible is false", () => {
      const { container } = render(<SelectionOverlay isVisible={false} rect={defaultRect} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when rect is null", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when both isVisible is false and rect is null", () => {
      const { container } = render(<SelectionOverlay isVisible={false} rect={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when isVisible is true and rect is provided", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe("positioning", () => {
    it("should apply correct top position", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.top).toBe("100px");
    });

    it("should apply correct left position", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.left).toBe("200px");
    });

    it("should apply correct width", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.width).toBe("300px");
    });

    it("should apply correct height", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.height).toBe("150px");
    });

    it("should handle zero values", () => {
      const zeroRect = { top: 0, left: 0, width: 0, height: 0 };
      const { container } = render(<SelectionOverlay isVisible={true} rect={zeroRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.top).toBe("0px");
      expect(overlay.style.left).toBe("0px");
    });

    it("should handle large values", () => {
      const largeRect = { top: 5000, left: 3000, width: 2000, height: 1500 };
      const { container } = render(<SelectionOverlay isVisible={true} rect={largeRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.top).toBe("5000px");
      expect(overlay.style.left).toBe("3000px");
      expect(overlay.style.width).toBe("2000px");
      expect(overlay.style.height).toBe("1500px");
    });
  });

  describe("styling", () => {
    it("should have fixed positioning", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("fixed");
    });

    it("should have pointer-events-none class", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("pointer-events-none");
    });

    it("should have high z-index class", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("z-[10000]");
    });

    it("should have blue border classes", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("border-2");
      expect(overlay).toHaveClass("border-blue-500");
    });

    it("should have semi-transparent background", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("bg-blue-500/10");
    });

    it("should have transition classes", () => {
      const { container } = render(<SelectionOverlay isVisible={true} rect={defaultRect} />);
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass("transition-all");
    });
  });
});
