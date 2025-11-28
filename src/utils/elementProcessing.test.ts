import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { filterNonConversationElements, enhanceElementWithStyles } from "./elementProcessing";
import { SelectedElement } from "../types";

describe("elementProcessing", () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = "";
  });

  describe("filterNonConversationElements", () => {
    it("should remove elements with testid selectors", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <button data-testid="copy-turn-action-button">Copy</button>
        <p>Content to keep</p>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector('[data-testid="copy-turn-action-button"]')).toBeNull();
      expect(container.textContent).toContain("Content to keep");
    });

    it("should remove model switcher button", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <button data-testid="model-switcher-dropdown-button">GPT-4</button>
        <p>Message</p>
      `;

      filterNonConversationElements(container);

      expect(
        container.querySelector('[data-testid="model-switcher-dropdown-button"]')
      ).toBeNull();
    });

    it("should remove share button", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <button data-testid="share-chat-button">Share</button>
        <p>Message</p>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector('[data-testid="share-chat-button"]')).toBeNull();
    });

    it("should remove page header", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <header id="page-header">Header</header>
        <main>Content</main>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector("#page-header")).toBeNull();
      expect(container.textContent).toContain("Content");
    });

    it("should remove footer elements", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <p>Message content</p>
        <footer>Footer content</footer>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector("footer")).toBeNull();
    });

    it("should remove navigation elements", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <nav>Navigation</nav>
        <div role="navigation">Side nav</div>
        <p>Main content</p>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector("nav")).toBeNull();
      expect(container.querySelector('[role="navigation"]')).toBeNull();
    });

    it("should remove textareas", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <p>Chat message</p>
        <textarea>Input</textarea>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector("textarea")).toBeNull();
    });

    it("should remove contenteditable elements", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div contenteditable="true">Editable</div>
        <p>Message</p>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector('[contenteditable="true"]')).toBeNull();
    });

    it("should remove elements with specific aria-labels", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <button aria-label="Copy">Copy</button>
        <button aria-label="Edit message">Edit</button>
        <button aria-label="Good response">👍</button>
        <button aria-label="Bad response">👎</button>
        <p>Content</p>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector('[aria-label="Copy"]')).toBeNull();
      expect(container.querySelector('[aria-label="Edit message"]')).toBeNull();
      expect(container.querySelector('[aria-label="Good response"]')).toBeNull();
      expect(container.querySelector('[aria-label="Bad response"]')).toBeNull();
    });

    it("should remove 1px elements (edge/decorative)", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="h-px w-px"></div>
        <div class="w-px">|</div>
        <p>Content</p>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector(".h-px.w-px")).toBeNull();
      expect(container.querySelector(".w-px")).toBeNull();
    });

    it("should remove small SVG icons", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <svg width="16" height="16"><path d="M0 0"/></svg>
        <svg width="200" height="200"><circle r="50"/></svg>
        <p>Content</p>
      `;

      filterNonConversationElements(container);

      // Small SVG should be removed
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBe(1);
      expect(svgs[0].getAttribute("width")).toBe("200");
    });

    it("should keep SVGs inside code blocks", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <pre><code><svg width="16" height="16"></svg></code></pre>
      `;

      filterNonConversationElements(container);

      expect(container.querySelector("svg")).not.toBeNull();
    });

    it("should remove empty pointer-events-none elements", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="pointer-events-none"></div>
        <div class="pointer-events-none">Has content</div>
        <p>Main content</p>
      `;

      filterNonConversationElements(container);

      const overlays = container.querySelectorAll(".pointer-events-none");
      expect(overlays.length).toBe(1);
      expect(overlays[0].textContent).toBe("Has content");
    });

    it("should not remove elements with substantial content", () => {
      const container = document.createElement("div");
      // Create content that is longer than 500 characters
      const longContent = "a".repeat(600);
      container.innerHTML = `
        <header id="page-header">${longContent}</header>
      `;

      filterNonConversationElements(container);

      // Should keep because it has substantial content
      expect(container.textContent).toContain(longContent);
    });

    it("should handle invalid selectors gracefully", () => {
      const container = document.createElement("div");
      container.innerHTML = "<p>Content</p>";

      // This should not throw
      expect(() => filterNonConversationElements(container)).not.toThrow();
    });
  });

  describe("enhanceElementWithStyles", () => {
    it("should return content when original element not found", () => {
      const element: SelectedElement = {
        id: "1",
        originalId: "nonexistent",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: "<p>Test content</p>",
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toContain("Test content");
    });

    it("should find original element by ID and clone it", () => {
      // Create element in DOM
      const original = document.createElement("div");
      original.id = "test-element";
      original.innerHTML = "<p>Original content</p>";
      original.style.color = "red";
      document.body.appendChild(original);

      const element: SelectedElement = {
        id: "1",
        originalId: "test-element",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: "<p>Original content</p>",
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toContain("Original content");
    });

    it("should apply stored computed styles if available", () => {
      const element: SelectedElement = {
        id: "1",
        originalId: "",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: "<div>Content</div>",
        computedStyles: {
          color: "rgb(255, 0, 0)",
          backgroundColor: "rgb(0, 0, 255)",
        },
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toContain("color");
    });

    it("should filter out UI elements from cloned content", () => {
      const original = document.createElement("div");
      original.id = "chat-message";
      original.innerHTML = `
        <p>Message text</p>
        <button data-testid="copy-turn-action-button">Copy</button>
      `;
      document.body.appendChild(original);

      const element: SelectedElement = {
        id: "1",
        originalId: "chat-message",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: original.outerHTML,
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toContain("Message text");
      expect(result).not.toContain("copy-turn-action-button");
    });

    it("should handle elements without originalId", () => {
      const element: SelectedElement = {
        id: "1",
        originalId: "",
        tagName: "div",
        className: "test-class",
        xpath: "/html/body/div",
        content: "<div class='test-class'>Content here</div>",
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toContain("Content here");
    });

    it("should return content as-is when parsing fails", () => {
      const element: SelectedElement = {
        id: "1",
        originalId: "",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: "not-html",
      };

      const result = enhanceElementWithStyles(element);
      // Should return something without throwing
      expect(result).toBeDefined();
    });

    it("should handle empty content", () => {
      const element: SelectedElement = {
        id: "1",
        originalId: "",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: "",
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toBe("");
    });

    it("should process nested elements", () => {
      const original = document.createElement("div");
      original.id = "nested-test";
      original.innerHTML = `
        <div>
          <p>Nested paragraph</p>
          <span>Nested span</span>
        </div>
      `;
      document.body.appendChild(original);

      const element: SelectedElement = {
        id: "1",
        originalId: "nested-test",
        tagName: "div",
        className: "",
        xpath: "/html/body/div",
        content: original.outerHTML,
      };

      const result = enhanceElementWithStyles(element);
      expect(result).toContain("Nested paragraph");
      expect(result).toContain("Nested span");
    });
  });
});
