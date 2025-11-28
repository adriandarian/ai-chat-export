import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { htmlToMarkdown, generateExportMarkdown } from "./markdownExport";
import { SelectedElement } from "../types";

describe("markdownExport", () => {
  describe("htmlToMarkdown", () => {
    describe("headings", () => {
      it("should convert h1 to #", () => {
        const result = htmlToMarkdown("<h1>Heading 1</h1>");
        expect(result).toContain("# Heading 1");
      });

      it("should convert h2 to ##", () => {
        const result = htmlToMarkdown("<h2>Heading 2</h2>");
        expect(result).toContain("## Heading 2");
      });

      it("should convert h3 to ###", () => {
        const result = htmlToMarkdown("<h3>Heading 3</h3>");
        expect(result).toContain("### Heading 3");
      });

      it("should convert h4 to ####", () => {
        const result = htmlToMarkdown("<h4>Heading 4</h4>");
        expect(result).toContain("#### Heading 4");
      });

      it("should convert h5 to #####", () => {
        const result = htmlToMarkdown("<h5>Heading 5</h5>");
        expect(result).toContain("##### Heading 5");
      });

      it("should convert h6 to ######", () => {
        const result = htmlToMarkdown("<h6>Heading 6</h6>");
        expect(result).toContain("###### Heading 6");
      });
    });

    describe("paragraphs", () => {
      it("should convert paragraphs", () => {
        const result = htmlToMarkdown("<p>This is a paragraph.</p>");
        expect(result).toContain("This is a paragraph.");
      });

      it("should handle multiple paragraphs", () => {
        const result = htmlToMarkdown("<p>First</p><p>Second</p>");
        expect(result).toContain("First");
        expect(result).toContain("Second");
      });
    });

    describe("text formatting", () => {
      it("should convert strong to bold", () => {
        const result = htmlToMarkdown("<strong>bold text</strong>");
        expect(result).toContain("**bold text**");
      });

      it("should convert b to bold", () => {
        const result = htmlToMarkdown("<b>bold text</b>");
        expect(result).toContain("**bold text**");
      });

      it("should convert em to italic", () => {
        const result = htmlToMarkdown("<em>italic text</em>");
        expect(result).toContain("*italic text*");
      });

      it("should convert i to italic", () => {
        const result = htmlToMarkdown("<i>italic text</i>");
        expect(result).toContain("*italic text*");
      });

      it("should handle empty strong elements", () => {
        const result = htmlToMarkdown("<strong></strong>");
        expect(result).not.toContain("****");
      });

      it("should handle empty em elements", () => {
        const result = htmlToMarkdown("<em></em>");
        expect(result).not.toContain("**");
      });
    });

    describe("code elements", () => {
      it("should convert inline code", () => {
        const result = htmlToMarkdown("Use <code>console.log()</code> to debug");
        expect(result).toContain("`console.log()`");
      });

      it("should convert code blocks", () => {
        const result = htmlToMarkdown("<pre><code>const x = 1;\nconsole.log(x);</code></pre>");
        expect(result).toContain("```");
        expect(result).toContain("const x = 1;");
        expect(result).toContain("console.log(x);");
      });

      it("should detect language from class", () => {
        const result = htmlToMarkdown(
          '<pre class="language-javascript"><code>const x = 1;</code></pre>',
        );
        expect(result).toContain("```javascript");
      });

      it("should detect language from code element class", () => {
        const result = htmlToMarkdown(
          '<pre><code class="language-typescript">const x: number = 1;</code></pre>',
        );
        expect(result).toContain("```typescript");
      });

      it("should handle pre without code element", () => {
        const result = htmlToMarkdown("<pre>plain text</pre>");
        expect(result).toContain("```");
        expect(result).toContain("plain text");
      });

      it("should handle empty code blocks", () => {
        const result = htmlToMarkdown("<pre><code></code></pre>");
        // Empty code block should not produce ```\n```
        expect(result).not.toMatch(/```\s*```/);
      });
    });

    describe("lists", () => {
      it("should convert unordered lists", () => {
        const result = htmlToMarkdown("<ul><li>Item 1</li><li>Item 2</li></ul>");
        expect(result).toContain("- Item 1");
        expect(result).toContain("- Item 2");
      });

      it("should convert ordered lists", () => {
        const result = htmlToMarkdown("<ol><li>First</li><li>Second</li></ol>");
        expect(result).toContain("1. First");
        expect(result).toContain("1. Second");
      });

      it("should handle empty list items", () => {
        const result = htmlToMarkdown("<ul><li>Item</li><li></li></ul>");
        expect(result).toContain("- Item");
      });

      it("should handle empty lists", () => {
        const result = htmlToMarkdown("<ul></ul>");
        expect(result).not.toContain("-");
      });
    });

    describe("links and images", () => {
      it("should convert links", () => {
        const result = htmlToMarkdown('<a href="https://example.com">Example</a>');
        expect(result).toContain("[Example](https://example.com)");
      });

      it("should handle links without href", () => {
        const result = htmlToMarkdown("<a>Link text</a>");
        expect(result).toContain("Link text");
        expect(result).not.toContain("[]()");
      });

      it("should convert images", () => {
        const result = htmlToMarkdown('<img src="image.png" alt="Alt text" />');
        expect(result).toContain("![Alt text](image.png)");
      });

      it("should handle images without alt", () => {
        const result = htmlToMarkdown('<img src="image.png" />');
        expect(result).toContain("![image](image.png)");
      });

      it("should handle images without src", () => {
        const result = htmlToMarkdown('<img alt="No source" />');
        expect(result).not.toContain("![]");
      });
    });

    describe("blockquotes", () => {
      it("should convert blockquotes", () => {
        const result = htmlToMarkdown("<blockquote>Quoted text</blockquote>");
        expect(result).toContain("> Quoted text");
      });

      it("should handle multiline blockquotes", () => {
        // Whitespace is normalized, so newlines become spaces
        const result = htmlToMarkdown("<blockquote>Line 1\nLine 2</blockquote>");
        expect(result).toContain("> Line 1");
        // Content is joined on single line due to whitespace normalization
      });
    });

    describe("horizontal rules", () => {
      it("should convert hr to ---", () => {
        const result = htmlToMarkdown("<hr />");
        expect(result).toContain("---");
      });
    });

    describe("line breaks", () => {
      it("should convert br to newline", () => {
        const result = htmlToMarkdown("Line 1<br />Line 2");
        expect(result).toContain("Line 1");
        expect(result).toContain("Line 2");
      });
    });

    describe("container elements", () => {
      it("should handle div elements", () => {
        const result = htmlToMarkdown("<div>Content in div</div>");
        expect(result).toContain("Content in div");
      });

      it("should handle span elements", () => {
        const result = htmlToMarkdown("<span>Content in span</span>");
        expect(result).toContain("Content in span");
      });

      it("should handle article elements", () => {
        const result = htmlToMarkdown("<article>Article content</article>");
        expect(result).toContain("Article content");
      });

      it("should handle section elements", () => {
        const result = htmlToMarkdown("<section>Section content</section>");
        expect(result).toContain("Section content");
      });

      it("should handle main elements", () => {
        const result = htmlToMarkdown("<main>Main content</main>");
        expect(result).toContain("Main content");
      });
    });

    describe("role detection", () => {
      it("should detect user role from data attribute", () => {
        const result = htmlToMarkdown('<div data-message-author-role="user">User message</div>');
        expect(result).toContain("**User:**");
        expect(result).toContain("User message");
      });

      it("should detect assistant role from data attribute", () => {
        const result = htmlToMarkdown(
          '<div data-message-author-role="assistant">Assistant response</div>',
        );
        expect(result).toContain("**Assistant:**");
        expect(result).toContain("Assistant response");
      });

      it("should detect human role as user", () => {
        const result = htmlToMarkdown('<div data-message-author-role="human">Human input</div>');
        expect(result).toContain("**User:**");
      });

      it("should detect ai role as assistant", () => {
        const result = htmlToMarkdown('<div data-message-author-role="ai">AI response</div>');
        expect(result).toContain("**Assistant:**");
      });

      it("should detect bot role as assistant", () => {
        const result = htmlToMarkdown('<div data-message-author-role="bot">Bot response</div>');
        expect(result).toContain("**Assistant:**");
      });

      it("should not add role markers for empty content", () => {
        const result = htmlToMarkdown('<div data-message-author-role="user"></div>');
        expect(result).not.toContain("**User:**");
      });
    });

    describe("UI element skipping", () => {
      it("should skip button elements", () => {
        const result = htmlToMarkdown("<button>Copy</button><p>Content</p>");
        expect(result).not.toContain("Copy");
        expect(result).toContain("Content");
      });

      it("should skip elements with role=button", () => {
        const result = htmlToMarkdown('<div role="button">Click me</div><p>Text</p>');
        expect(result).not.toContain("Click me");
        expect(result).toContain("Text");
      });

      it("should skip elements with copy class", () => {
        const result = htmlToMarkdown('<div class="copy-button">Copy</div><p>Code</p>');
        expect(result).not.toContain("Copy");
        expect(result).toContain("Code");
      });

      it("should skip elements with toolbar class", () => {
        const result = htmlToMarkdown('<div class="toolbar">Tools</div><p>Main content</p>');
        expect(result).not.toContain("Tools");
        expect(result).toContain("Main content");
      });
    });

    describe("whitespace handling", () => {
      it("should normalize whitespace", () => {
        const result = htmlToMarkdown("<p>Multiple    spaces</p>");
        expect(result).toContain("Multiple spaces");
      });

      it("should clean up excessive newlines", () => {
        const result = htmlToMarkdown("<p>Para 1</p><p></p><p></p><p>Para 2</p>");
        // Should not have more than 2 consecutive newlines
        expect(result).not.toMatch(/\n{3,}/);
      });
    });
  });

  describe("generateExportMarkdown", () => {
    let originalLocation: Location;
    let mockDate: Date;

    beforeEach(() => {
      // Mock window.location
      originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: { href: "https://example.com/chat" },
        writable: true,
      });

      // Mock Date
      mockDate = new Date("2024-01-15T10:30:00");
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
      vi.useRealTimers();
    });

    it("should generate markdown with header", () => {
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

      const result = generateExportMarkdown(elements);
      expect(result).toContain("# Chat Export");
      expect(result).toContain("**Exported:**");
      expect(result).toContain("**Source:**");
      expect(result).toContain("https://example.com/chat");
    });

    it("should include content from elements", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<p>Test content here</p>",
        },
      ];

      const result = generateExportMarkdown(elements);
      expect(result).toContain("Test content here");
    });

    it("should join multiple elements with separators", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[1]",
          content: "<p>First message</p>",
        },
        {
          id: "2",
          originalId: "orig-2",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[2]",
          content: "<p>Second message</p>",
        },
      ];

      const result = generateExportMarkdown(elements);
      expect(result).toContain("First message");
      expect(result).toContain("---");
      expect(result).toContain("Second message");
    });

    it("should filter out empty results", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[1]",
          content: "<p>Actual content</p>",
        },
        {
          id: "2",
          originalId: "orig-2",
          tagName: "div",
          className: "",
          xpath: "/html/body/div[2]",
          content: "<div></div>",
        },
      ];

      const result = generateExportMarkdown(elements);
      expect(result).toContain("Actual content");
      // Should not have extra separators for empty content
    });

    it("should return empty string for no elements", () => {
      const result = generateExportMarkdown([]);
      expect(result).toBe("");
    });

    it("should return empty string for elements with only whitespace", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: "<div>   </div>",
        },
      ];

      const result = generateExportMarkdown(elements);
      expect(result).toBe("");
    });

    it("should handle complex HTML content", () => {
      const elements: SelectedElement[] = [
        {
          id: "1",
          originalId: "orig-1",
          tagName: "div",
          className: "",
          xpath: "/html/body/div",
          content: `
            <h2>Code Example</h2>
            <p>Here is some <strong>code</strong>:</p>
            <pre class="language-javascript"><code>const x = 1;</code></pre>
            <ul>
              <li>Point one</li>
              <li>Point two</li>
            </ul>
          `,
        },
      ];

      const result = generateExportMarkdown(elements);
      expect(result).toContain("## Code Example");
      expect(result).toContain("**code**");
      expect(result).toContain("```javascript");
      expect(result).toContain("- Point one");
      expect(result).toContain("- Point two");
    });
  });
});
