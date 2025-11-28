import { describe, it, expect, beforeEach } from "vitest";
import { rebuildCodeBlocks, fixCodeBlocks, KNOWN_LANGUAGES } from "./codeBlocks";

describe("codeBlocks", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("KNOWN_LANGUAGES re-export", () => {
    it("should re-export KNOWN_LANGUAGES from languageDetection", () => {
      expect(KNOWN_LANGUAGES).toBeDefined();
      expect(Array.isArray(KNOWN_LANGUAGES)).toBe(true);
      expect(KNOWN_LANGUAGES).toContain("javascript");
      expect(KNOWN_LANGUAGES).toContain("python");
    });
  });

  describe("rebuildCodeBlocks", () => {
    it("should be a function", () => {
      expect(typeof rebuildCodeBlocks).toBe("function");
    });

    it("should handle empty container", () => {
      const container = document.createElement("div");
      expect(() => rebuildCodeBlocks(container)).not.toThrow();
    });

    it("should handle container without pre elements", () => {
      const container = document.createElement("div");
      container.innerHTML = "<p>No code here</p><div>Just text</div>";
      expect(() => rebuildCodeBlocks(container)).not.toThrow();
    });

    it("should process pre elements", () => {
      const container = document.createElement("div");
      container.innerHTML = '<pre class="language-javascript"><code>const x = 1;</code></pre>';
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      // Should have created a wrapper
      const wrapper = container.querySelector(".exported-code-wrapper");
      expect(wrapper).not.toBeNull();
    });

    it("should apply language badge when language is detected", () => {
      const container = document.createElement("div");
      container.innerHTML = '<pre class="language-python"><code>print("hello")</code></pre>';
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const badge = container.querySelector(".exported-code-lang");
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe("python");
    });

    it("should not add badge when language is not detected", () => {
      const container = document.createElement("div");
      container.innerHTML = "<pre><code>some code without language</code></pre>";
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const badge = container.querySelector(".exported-code-lang");
      expect(badge).toBeNull();
    });

    it("should skip empty pre elements", () => {
      const container = document.createElement("div");
      container.innerHTML = "<pre><code>   </code></pre>";
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      // Empty pre should remain unchanged (not wrapped)
      const wrapper = container.querySelector(".exported-code-wrapper");
      expect(wrapper).toBeNull();
    });

    it("should remove toolbar elements before processing", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <pre>
          <button>Copy</button>
          <code>const x = 1;</code>
        </pre>
      `;
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      // The button should be gone, only the code content should remain
      const codeBlock = container.querySelector(".exported-code-block");
      expect(codeBlock?.textContent).not.toContain("Copy");
      expect(codeBlock?.textContent).toContain("const x = 1");
    });

    it("should apply syntax highlighting for known languages", () => {
      const container = document.createElement("div");
      container.innerHTML = '<pre class="language-javascript"><code>const x = 1;</code></pre>';
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const codeElement = container.querySelector("code");
      // Check that innerHTML contains span elements (from highlighting)
      expect(codeElement?.innerHTML).toContain("span");
    });

    it("should set data-language attribute on rebuilt pre", () => {
      const container = document.createElement("div");
      container.innerHTML =
        '<pre class="language-typescript"><code>const x: number = 1;</code></pre>';
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const pre = container.querySelector(".exported-code-block");
      expect(pre?.getAttribute("data-language")).toBe("typescript");
    });

    it("should set overflow to visible on divs", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="some-div" style="overflow: hidden;">Content</div>
        <pre><code>code</code></pre>
      `;
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const div = container.querySelector(".some-div") as HTMLElement;
      expect(div?.style.overflow).toBe("visible");
    });

    it("should replace existing code-block wrapper", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="code-block">
          <pre><code>const x = 1;</code></pre>
        </div>
      `;
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      // The old wrapper should be replaced with the new one
      const newWrapper = container.querySelector(".exported-code-wrapper");
      expect(newWrapper).not.toBeNull();
    });
  });

  describe("fixCodeBlocks", () => {
    it("should be an alias for rebuildCodeBlocks", () => {
      expect(fixCodeBlocks).toBe(rebuildCodeBlocks);
    });
  });

  describe("code wrapper styling", () => {
    it("should apply correct wrapper styles", () => {
      const container = document.createElement("div");
      container.innerHTML = '<pre class="language-javascript"><code>const x = 1;</code></pre>';
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const wrapper = container.querySelector(".exported-code-wrapper") as HTMLElement;
      expect(wrapper?.style.position).toBe("relative");
      expect(wrapper?.style.borderRadius).toBe("8px");
      expect(wrapper?.style.overflow).toBe("hidden");
    });

    it("should apply correct pre styles", () => {
      const container = document.createElement("div");
      container.innerHTML = '<pre class="language-javascript"><code>const x = 1;</code></pre>';
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const pre = container.querySelector(".exported-code-block") as HTMLElement;
      expect(pre?.style.whiteSpace).toBe("pre-wrap");
      expect(pre?.style.margin).toBe("0px");
    });
  });

  describe("background color handling", () => {
    it("should default to dark theme color for transparent backgrounds", () => {
      const container = document.createElement("div");
      container.innerHTML = "<pre><code>const x = 1;</code></pre>";
      document.body.appendChild(container);

      rebuildCodeBlocks(container);

      const wrapper = container.querySelector(".exported-code-wrapper") as HTMLElement;
      // Default dark theme color is #1e1e1e
      expect(wrapper?.style.backgroundColor).toBe("#1e1e1e");
    });
  });
});
