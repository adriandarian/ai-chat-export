import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectionModeToggle } from "./SelectionModeToggle";

describe("SelectionModeToggle", () => {
  const defaultProps = {
    mode: "element" as const,
    onModeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render both mode buttons", () => {
      render(<SelectionModeToggle {...defaultProps} />);
      expect(screen.getByText("Element")).toBeInTheDocument();
      expect(screen.getByText("Conversation")).toBeInTheDocument();
    });

    it("should highlight element button when mode is element", () => {
      render(<SelectionModeToggle {...defaultProps} mode="element" />);
      const elementButton = screen.getByText("Element").closest("button");
      expect(elementButton).toHaveClass("bg-blue-600");
    });

    it("should highlight conversation button when mode is conversation", () => {
      render(<SelectionModeToggle {...defaultProps} mode="conversation" />);
      const conversationButton = screen.getByText("Conversation").closest("button");
      expect(conversationButton).toHaveClass("bg-blue-600");
    });

    it("should have correct title attributes", () => {
      render(<SelectionModeToggle {...defaultProps} />);
      expect(screen.getByTitle("Select individual elements")).toBeInTheDocument();
      expect(screen.getByTitle("Select entire conversations")).toBeInTheDocument();
    });
  });

  describe("themes", () => {
    it("should apply light theme by default", () => {
      const { container } = render(<SelectionModeToggle {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("bg-blue-50");
    });

    it("should apply dark theme styles", () => {
      const { container } = render(<SelectionModeToggle {...defaultProps} theme="dark" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("bg-slate-800/50");
    });

    it("should apply midnight theme styles (same as dark)", () => {
      const { container } = render(<SelectionModeToggle {...defaultProps} theme="midnight" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("bg-slate-800/50");
    });
  });

  describe("interactions", () => {
    it("should call onModeChange with 'element' when element button is clicked", () => {
      const onModeChange = vi.fn();
      render(
        <SelectionModeToggle {...defaultProps} onModeChange={onModeChange} mode="conversation" />,
      );

      fireEvent.click(screen.getByText("Element"));
      expect(onModeChange).toHaveBeenCalledWith("element");
    });

    it("should call onModeChange with 'conversation' when conversation button is clicked", () => {
      const onModeChange = vi.fn();
      render(<SelectionModeToggle {...defaultProps} onModeChange={onModeChange} mode="element" />);

      fireEvent.click(screen.getByText("Conversation"));
      expect(onModeChange).toHaveBeenCalledWith("conversation");
    });

    it("should still call onModeChange when clicking already selected mode", () => {
      const onModeChange = vi.fn();
      render(<SelectionModeToggle {...defaultProps} onModeChange={onModeChange} mode="element" />);

      fireEvent.click(screen.getByText("Element"));
      expect(onModeChange).toHaveBeenCalledWith("element");
    });
  });

  describe("inactive button styling", () => {
    it("should style inactive element button correctly in light mode", () => {
      render(<SelectionModeToggle {...defaultProps} mode="conversation" theme="light" />);
      const elementButton = screen.getByText("Element").closest("button");
      expect(elementButton).toHaveClass("bg-white");
      expect(elementButton).not.toHaveClass("bg-blue-600");
    });

    it("should style inactive conversation button correctly in dark mode", () => {
      render(<SelectionModeToggle {...defaultProps} mode="element" theme="dark" />);
      const conversationButton = screen.getByText("Conversation").closest("button");
      expect(conversationButton).toHaveClass("bg-slate-700");
      expect(conversationButton).not.toHaveClass("bg-blue-600");
    });
  });
});
