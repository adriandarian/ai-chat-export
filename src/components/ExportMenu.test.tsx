import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportMenu } from "./ExportMenu";

describe("ExportMenu", () => {
  const defaultProps = {
    isOpen: false,
    onToggle: vi.fn(),
    onExport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the export button", () => {
      render(<ExportMenu {...defaultProps} />);
      expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    });

    it("should not show dropdown when closed", () => {
      render(<ExportMenu {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Export as HTML")).not.toBeInTheDocument();
    });

    it("should show dropdown when open", () => {
      render(<ExportMenu {...defaultProps} isOpen={true} />);
      expect(screen.getByText("Export as HTML")).toBeInTheDocument();
      expect(screen.getByText("Export as PDF")).toBeInTheDocument();
      expect(screen.getByText("Export as Markdown")).toBeInTheDocument();
      expect(screen.getByText("Export as JSON")).toBeInTheDocument();
    });

    it("should disable button when disabled prop is true", () => {
      render(<ExportMenu {...defaultProps} disabled={true} />);
      expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    });

    it("should enable button when disabled prop is false", () => {
      render(<ExportMenu {...defaultProps} disabled={false} />);
      expect(screen.getByRole("button", { name: /export/i })).not.toBeDisabled();
    });
  });

  describe("themes", () => {
    it("should apply light theme by default", () => {
      render(<ExportMenu {...defaultProps} isOpen={true} />);
      const dropdown = screen.getByText("Export as HTML").parentElement;
      expect(dropdown).toHaveClass("bg-white");
    });

    it("should apply dark theme styles", () => {
      render(<ExportMenu {...defaultProps} isOpen={true} theme="dark" />);
      const dropdown = screen.getByText("Export as HTML").parentElement;
      expect(dropdown).toHaveClass("bg-slate-800");
    });

    it("should apply midnight theme styles (same as dark)", () => {
      render(<ExportMenu {...defaultProps} isOpen={true} theme="midnight" />);
      const dropdown = screen.getByText("Export as HTML").parentElement;
      expect(dropdown).toHaveClass("bg-slate-800");
    });
  });

  describe("interactions", () => {
    it("should call onToggle when export button is clicked", () => {
      const onToggle = vi.fn();
      render(<ExportMenu {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole("button", { name: /export/i }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("should call onExport with 'html' when HTML option is clicked", () => {
      const onExport = vi.fn();
      render(<ExportMenu {...defaultProps} isOpen={true} onExport={onExport} />);

      fireEvent.click(screen.getByText("Export as HTML"));
      expect(onExport).toHaveBeenCalledWith("html");
    });

    it("should call onExport with 'pdf' when PDF option is clicked", () => {
      const onExport = vi.fn();
      render(<ExportMenu {...defaultProps} isOpen={true} onExport={onExport} />);

      fireEvent.click(screen.getByText("Export as PDF"));
      expect(onExport).toHaveBeenCalledWith("pdf");
    });

    it("should call onExport with 'markdown' when Markdown option is clicked", () => {
      const onExport = vi.fn();
      render(<ExportMenu {...defaultProps} isOpen={true} onExport={onExport} />);

      fireEvent.click(screen.getByText("Export as Markdown"));
      expect(onExport).toHaveBeenCalledWith("markdown");
    });

    it("should call onExport with 'json' when JSON option is clicked", () => {
      const onExport = vi.fn();
      render(<ExportMenu {...defaultProps} isOpen={true} onExport={onExport} />);

      fireEvent.click(screen.getByText("Export as JSON"));
      expect(onExport).toHaveBeenCalledWith("json");
    });

    it("should not call onToggle when button is disabled", () => {
      const onToggle = vi.fn();
      render(<ExportMenu {...defaultProps} onToggle={onToggle} disabled={true} />);

      fireEvent.click(screen.getByRole("button", { name: /export/i }));
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe("chevron rotation", () => {
    it("should rotate chevron when menu is open", () => {
      const { container } = render(<ExportMenu {...defaultProps} isOpen={true} />);
      const chevron = container.querySelector(".rotate-180");
      expect(chevron).toBeInTheDocument();
    });

    it("should not rotate chevron when menu is closed", () => {
      const { container } = render(<ExportMenu {...defaultProps} isOpen={false} />);
      const chevron = container.querySelector(".rotate-180");
      expect(chevron).not.toBeInTheDocument();
    });
  });
});
