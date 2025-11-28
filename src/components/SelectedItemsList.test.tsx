import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectedItemsList } from "./SelectedItemsList";
import { SelectedElement } from "../types";

describe("SelectedItemsList", () => {
  const mockItems: SelectedElement[] = [
    {
      id: "1",
      originalId: "orig-1",
      tagName: "div",
      className: "message",
      xpath: "/html/body/div[1]",
      content: "<p>Hello world this is a test message with some content</p>",
    },
    {
      id: "2",
      originalId: "orig-2",
      tagName: "pre",
      className: "code-block",
      xpath: "/html/body/pre[1]",
      content: "<pre><code>console.log('test');</code></pre>",
    },
  ];

  const defaultProps = {
    items: [],
    selectionMode: "element" as const,
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("empty state", () => {
    it("should show element mode empty message when no items and mode is element", () => {
      render(<SelectedItemsList {...defaultProps} selectionMode="element" />);
      expect(screen.getByText(/hover and click elements/i)).toBeInTheDocument();
    });

    it("should show conversation mode empty message when no items and mode is conversation", () => {
      render(<SelectedItemsList {...defaultProps} selectionMode="conversation" />);
      expect(screen.getByText(/select entire conversation/i)).toBeInTheDocument();
      expect(screen.getByText(/capture the full chat/i)).toBeInTheDocument();
    });

    it("should show conversation helper text", () => {
      render(<SelectedItemsList {...defaultProps} selectionMode="conversation" />);
      expect(screen.getByText(/hundreds of pages/i)).toBeInTheDocument();
    });
  });

  describe("with items", () => {
    it("should render all items", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} />);
      // Tag names are lowercase in DOM but styled with CSS uppercase
      expect(screen.getByText("div")).toBeInTheDocument();
      expect(screen.getByText("pre")).toBeInTheDocument();
    });

    it("should display truncated content", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} />);
      // Content is stripped of HTML tags and truncated
      expect(screen.getByText(/Hello world this is a test message/)).toBeInTheDocument();
    });

    it("should show remove buttons on hover", () => {
      const { container } = render(<SelectedItemsList {...defaultProps} items={mockItems} />);
      // Buttons exist but are hidden by opacity
      const removeButtons = container.querySelectorAll("button");
      expect(removeButtons.length).toBe(2);
    });

    it("should call onRemove when remove button is clicked", () => {
      const onRemove = vi.fn();
      const { container } = render(
        <SelectedItemsList {...defaultProps} items={mockItems} onRemove={onRemove} />,
      );

      const removeButtons = container.querySelectorAll("button");
      fireEvent.click(removeButtons[0]);
      expect(onRemove).toHaveBeenCalledWith("1");
    });

    it("should call onRemove with correct id for second item", () => {
      const onRemove = vi.fn();
      const { container } = render(
        <SelectedItemsList {...defaultProps} items={mockItems} onRemove={onRemove} />,
      );

      const removeButtons = container.querySelectorAll("button");
      fireEvent.click(removeButtons[1]);
      expect(onRemove).toHaveBeenCalledWith("2");
    });
  });

  describe("themes", () => {
    it("should apply light theme by default for empty state", () => {
      render(<SelectedItemsList {...defaultProps} theme="light" />);
      const emptyMessage = screen.getByText(/hover and click elements/i).parentElement;
      expect(emptyMessage).toHaveClass("text-gray-400");
    });

    it("should apply dark theme for empty state", () => {
      render(<SelectedItemsList {...defaultProps} theme="dark" />);
      const emptyMessage = screen.getByText(/hover and click elements/i).parentElement;
      expect(emptyMessage).toHaveClass("text-slate-400");
    });

    it("should apply light theme for items", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} theme="light" />);
      // Tag names are lowercase in DOM but styled with CSS uppercase
      const listItem = screen.getByText("div").closest("li");
      expect(listItem).toHaveClass("bg-gray-50");
    });

    it("should apply dark theme for items", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} theme="dark" />);
      const listItem = screen.getByText("div").closest("li");
      expect(listItem).toHaveClass("bg-slate-700/50");
    });

    it("should apply midnight theme (same as dark)", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} theme="midnight" />);
      const listItem = screen.getByText("div").closest("li");
      expect(listItem).toHaveClass("bg-slate-700/50");
    });
  });

  describe("tag name display", () => {
    it("should display tag names with uppercase CSS styling", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} />);
      // Tag names are lowercase in DOM but styled with CSS uppercase class
      const tagName = screen.getByText("div");
      expect(tagName).toHaveClass("uppercase");
    });

    it("should style tag names with blue color", () => {
      render(<SelectedItemsList {...defaultProps} items={mockItems} />);
      const tagName = screen.getByText("div");
      expect(tagName).toHaveClass("text-blue-500");
    });
  });

  describe("content stripping", () => {
    it("should strip HTML tags from content", () => {
      const itemWithHtml: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[1]",
          content: "<div><span>Test</span> <b>content</b></div>",
        },
      ];
      render(<SelectedItemsList {...defaultProps} items={itemWithHtml} />);
      // The content should have HTML stripped
      expect(screen.getByText(/Test content/)).toBeInTheDocument();
    });
  });
});
