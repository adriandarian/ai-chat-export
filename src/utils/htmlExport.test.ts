import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateExportHTML } from "./htmlExport";
import { SelectedElement } from "../types";

// Mock the dependencies
vi.mock("./styles", () => ({
  getPageStyles: vi.fn(() => "<style>/* page styles */</style>"),
  getDocumentBackgroundColor: vi.fn(() => "#ffffff"),
}));

vi.mock("./elementProcessing", () => ({
  enhanceElementWithStyles: vi.fn((el: SelectedElement) => el.content),
}));

describe("htmlExport", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        href: "https://example.com/chat",
        origin: "https://example.com",
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  describe("generateExportHTML", () => {
    it("should generate valid HTML document", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Hello world</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<html>");
      expect(result).toContain("</html>");
    });

    it("should include meta charset", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain('<meta charset="UTF-8">');
    });

    it("should include viewport meta tag", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain('name="viewport"');
      expect(result).toContain("width=device-width");
    });

    it("should include title with date", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("<title>Chat Export -");
    });

    it("should include base href from origin", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain('<base href="https://example.com">');
    });

    it("should include Google Fonts links", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("fonts.googleapis.com");
      expect(result).toContain("fonts.gstatic.com");
      expect(result).toContain("Inter");
      expect(result).toContain("JetBrains+Mono");
    });

    it("should include export wrapper class", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Content here</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain('class="ai-chat-export-wrapper"');
      expect(result).toContain('class="ai-chat-export-item"');
    });

    it("should include element content", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>My test content</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("<p>My test content</p>");
    });

    it("should join multiple elements", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[1]",
          content: "<p>First element</p>",
        },
        {
          id: "2",
          originalId: "orig-2",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[2]",
          content: "<p>Second element</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("<p>First element</p>");
      expect(result).toContain("<p>Second element</p>");
    });

    it("should include inline styles", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("<style>");
      expect(result).toContain("</style>");
    });

    it("should include client-side script", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test</p>",
        },
      ];

      const result = generateExportHTML(elements);
      expect(result).toContain("<script>");
      expect(result).toContain("</script>");
    });

    describe("CSS styles", () => {
      it("should include box-sizing border-box", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("box-sizing: border-box");
      });

      it("should include print media query", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("@media print");
      });

      it("should include code block styling", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain(".exported-code-block");
        expect(result).toContain(".exported-code-wrapper");
      });
    });

    describe("client-side script", () => {
      it("should include highlightCode function", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("highlightCode");
      });

      it("should include image URL fixing", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("querySelectorAll('img')");
      });

      it("should include code block processing", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("querySelectorAll('pre:not(.exported-code-block)')");
      });

      it("should handle JSON highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("lang === 'json'");
      });

      it("should handle JavaScript highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("javascript");
        expect(result).toContain("typescript");
      });

      it("should handle Python highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("python");
      });

      it("should handle Bash highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("bash");
        expect(result).toContain("shell");
      });

      it("should handle HTML/XML highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("'html'");
        expect(result).toContain("'xml'");
      });

      it("should handle CSS highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("'css'");
        expect(result).toContain("'scss'");
      });

      it("should handle SQL highlighting", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Test</p>",
          },
        ];

        const result = generateExportHTML(elements);
        expect(result).toContain("lang === 'sql'");
        expect(result).toContain("SELECT");
      });
    });

    it("should handle empty elements array", () => {
      const result = generateExportHTML([]);
      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("ai-chat-export-wrapper");
    });
  });
});
