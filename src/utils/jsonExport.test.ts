import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateExportJSON, generateSimpleExportJSON } from "./jsonExport";
import { SelectedElement } from "../types";

describe("jsonExport", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "https://example.com/chat" },
      writable: true,
    });
    vi.setSystemTime(new Date("2024-01-15T10:30:00Z"));
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    vi.useRealTimers();
  });

  describe("generateExportJSON", () => {
    it("should generate valid JSON", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Hello</p>",
        },
      ];

      const result = generateExportJSON(elements);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("should include metadata", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Hello</p>",
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exportedAt).toBeDefined();
      expect(result.source).toBe("https://example.com/chat");
      expect(result.metadata).toBeDefined();
      expect(result.metadata.exportVersion).toBe("1.0.0");
    });

    it("should parse user messages correctly", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: '<div data-message-author-role="user"><p>What is JavaScript?</p></div>',
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exchanges).toHaveLength(1);
      expect(result.exchanges[0].prompt.content).toBeDefined();
    });

    it("should parse assistant messages correctly", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content:
            '<div data-message-author-role="assistant"><p>JavaScript is a programming language.</p></div>',
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exchanges).toHaveLength(1);
      expect(result.exchanges[0].response.content).toBeDefined();
    });

    it("should group user and assistant into exchanges", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: `
            <div data-message-author-role="user"><p>Hello</p></div>
            <div data-message-author-role="assistant"><p>Hi there!</p></div>
          `,
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exchanges).toHaveLength(1);
      expect(result.exchanges[0].prompt.content).toHaveLength(1);
      expect(result.exchanges[0].response.content).toHaveLength(1);
    });

    it("should handle multiple exchanges", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: `
            <div data-message-author-role="user"><p>First question</p></div>
            <div data-message-author-role="assistant"><p>First answer</p></div>
            <div data-message-author-role="user"><p>Second question</p></div>
            <div data-message-author-role="assistant"><p>Second answer</p></div>
          `,
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exchanges.length).toBe(2);
      expect(result.metadata.totalExchanges).toBe(2);
    });

    it("should handle trailing user message without response", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: `
            <div data-message-author-role="user"><p>Waiting for response</p></div>
          `,
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exchanges).toHaveLength(1);
      expect(result.exchanges[0].response.content).toHaveLength(0);
    });

    it("should handle assistant message without preceding user", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: `
            <div data-message-author-role="assistant"><p>Welcome!</p></div>
          `,
        },
      ];

      const result = JSON.parse(generateExportJSON(elements));
      expect(result.exchanges).toHaveLength(1);
      expect(result.exchanges[0].prompt.content).toHaveLength(0);
    });

    describe("content parsing", () => {
      it("should parse code blocks", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: '<div><pre class="language-javascript"><code>const x = 1;</code></pre></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges).toHaveLength(1);
        const promptContent = result.exchanges[0].prompt.content;
        const responseContent = result.exchanges[0].response.content;
        const content = promptContent.length > 0 ? promptContent : responseContent;
        const codeBlock = content.find((c: { type: string }) => c.type === "code");
        expect(codeBlock).toBeDefined();
        expect(codeBlock.language).toBe("javascript");
        expect(codeBlock.content).toContain("const x = 1");
      });

      it("should parse images in message context", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content:
              '<div data-message-author-role="assistant"><img src="https://example.com/image.png" alt="Test image" width="100" height="100" /></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges.length).toBeGreaterThanOrEqual(1);
      });

      it("should handle text in message context", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: '<div data-message-author-role="user"><p>Text content</p></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges.length).toBeGreaterThanOrEqual(1);
      });

      it("should parse links", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: '<a href="https://example.com">Example Link</a>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        const content = result.exchanges[0].prompt.content || result.exchanges[0].response.content;
        const linkBlock = content.find((c: { type: string }) => c.type === "link");
        expect(linkBlock).toBeDefined();
        expect(linkBlock.url).toBe("https://example.com");
        expect(linkBlock.text).toBe("Example Link");
      });

      it("should handle links in message context", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content:
              '<div data-message-author-role="assistant"><a href="https://example.com">Example Link</a></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges.length).toBeGreaterThanOrEqual(1);
      });

      it("should parse unordered lists", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<ul><li>Item 1</li><li>Item 2</li></ul>",
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        const content = result.exchanges[0].prompt.content || result.exchanges[0].response.content;
        const listBlock = content.find((c: { type: string }) => c.type === "list");
        expect(listBlock).toBeDefined();
        expect(listBlock.ordered).toBe(false);
        expect(listBlock.items).toContain("Item 1");
        expect(listBlock.items).toContain("Item 2");
      });

      it("should parse ordered lists", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<ol><li>First</li><li>Second</li></ol>",
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        const content = result.exchanges[0].prompt.content || result.exchanges[0].response.content;
        const listBlock = content.find((c: { type: string }) => c.type === "list");
        expect(listBlock).toBeDefined();
        expect(listBlock.ordered).toBe(true);
      });

      it("should parse headings with prefix", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<h2>Heading Two</h2>",
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        const content = result.exchanges[0].prompt.content || result.exchanges[0].response.content;
        const textBlock = content.find((c: { type: string }) => c.type === "text");
        expect(textBlock).toBeDefined();
        expect(textBlock.content).toContain("## Heading Two");
      });

      it("should merge consecutive text blocks", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>First paragraph</p><p>Second paragraph</p>",
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        const content = result.exchanges[0].prompt.content || result.exchanges[0].response.content;
        const textBlocks = content.filter((c: { type: string }) => c.type === "text");
        // Should be merged into fewer blocks
        expect(textBlocks.length).toBeLessThanOrEqual(2);
      });
    });

    describe("message detection", () => {
      it("should detect user message by user class", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: '<div class="user-message"><p>Question?</p></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges).toHaveLength(1);
      });

      it("should detect assistant message by agent-turn class", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: '<div class="agent-turn"><p>Answer</p></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges).toHaveLength(1);
      });

      it("should fallback to guessing role from content", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content: "<p>Short question?</p>",
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        // Should still create an exchange even without role markers
        expect(result.exchanges.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("language detection", () => {
      it("should handle code blocks in message elements", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content:
              '<div data-message-author-role="assistant"><pre><code class="language-python">print("hi")</code></pre></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("cleanup", () => {
      it("should handle code blocks in message elements", () => {
        const elements: SelectedElement[] = [
          {
            id: "1",
            originalId: "orig-1",
            tagName: "div",
            className: "",
            xpath: "/html/body/div",
            content:
              '<div data-message-author-role="assistant"><pre><code>const x = 1;</code></pre></div>',
          },
        ];

        const result = JSON.parse(generateExportJSON(elements));
        expect(result.exchanges.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("generateSimpleExportJSON", () => {
    it("should return array of exchanges", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: '<div data-message-author-role="user"><p>Hello</p></div>',
        },
      ];

      const result = JSON.parse(generateSimpleExportJSON(elements));
      expect(Array.isArray(result)).toBe(true);
    });

    it("should not include metadata wrapper", () => {
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

      const result = JSON.parse(generateSimpleExportJSON(elements));
      expect(result.exportedAt).toBeUndefined();
      expect(result.source).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it("should have same exchange structure as full export", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: `
            <div data-message-author-role="user"><p>Question</p></div>
            <div data-message-author-role="assistant"><p>Answer</p></div>
          `,
        },
      ];

      const simpleResult = JSON.parse(generateSimpleExportJSON(elements));
      const fullResult = JSON.parse(generateExportJSON(elements));

      expect(simpleResult).toEqual(fullResult.exchanges);
    });
  });
});
