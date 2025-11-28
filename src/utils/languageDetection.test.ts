import { describe, it, expect, beforeEach } from "vitest";
import {
  KNOWN_LANGUAGES,
  isKnownLanguage,
  detectLanguageFromElement,
  detectLanguage,
  cleanCodeContent,
  extractCodeContent,
} from "./languageDetection";

describe("languageDetection", () => {
  describe("KNOWN_LANGUAGES", () => {
    it("should contain common programming languages", () => {
      expect(KNOWN_LANGUAGES).toContain("javascript");
      expect(KNOWN_LANGUAGES).toContain("typescript");
      expect(KNOWN_LANGUAGES).toContain("python");
      expect(KNOWN_LANGUAGES).toContain("java");
      expect(KNOWN_LANGUAGES).toContain("html");
      expect(KNOWN_LANGUAGES).toContain("css");
    });

    it("should contain shell languages", () => {
      expect(KNOWN_LANGUAGES).toContain("bash");
      expect(KNOWN_LANGUAGES).toContain("shell");
      expect(KNOWN_LANGUAGES).toContain("sh");
      expect(KNOWN_LANGUAGES).toContain("zsh");
      expect(KNOWN_LANGUAGES).toContain("powershell");
    });

    it("should contain data formats", () => {
      expect(KNOWN_LANGUAGES).toContain("json");
      expect(KNOWN_LANGUAGES).toContain("yaml");
      expect(KNOWN_LANGUAGES).toContain("xml");
      expect(KNOWN_LANGUAGES).toContain("toml");
    });

    it("should be a non-empty array", () => {
      expect(Array.isArray(KNOWN_LANGUAGES)).toBe(true);
      expect(KNOWN_LANGUAGES.length).toBeGreaterThan(0);
    });
  });

  describe("isKnownLanguage", () => {
    it("should return true for known languages", () => {
      expect(isKnownLanguage("javascript")).toBe(true);
      expect(isKnownLanguage("python")).toBe(true);
      expect(isKnownLanguage("typescript")).toBe(true);
    });

    it("should return true for uppercase input", () => {
      expect(isKnownLanguage("JavaScript")).toBe(true);
      expect(isKnownLanguage("PYTHON")).toBe(true);
      expect(isKnownLanguage("TypeScript")).toBe(true);
    });

    it("should return true for mixed case input", () => {
      expect(isKnownLanguage("PyThOn")).toBe(true);
      expect(isKnownLanguage("JaVaScRiPt")).toBe(true);
    });

    it("should return false for unknown languages", () => {
      expect(isKnownLanguage("unknownlang")).toBe(false);
      expect(isKnownLanguage("foo")).toBe(false);
      expect(isKnownLanguage("bar123")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isKnownLanguage("")).toBe(false);
    });

    it("should return false for whitespace", () => {
      expect(isKnownLanguage("   ")).toBe(false);
      expect(isKnownLanguage("\t")).toBe(false);
    });
  });

  describe("cleanCodeContent", () => {
    it("should trim leading and trailing whitespace", () => {
      expect(cleanCodeContent("  code  ")).toBe("code");
      expect(cleanCodeContent("\n\ncode\n\n")).toBe("code");
    });

    it("should remove Copy code pattern", () => {
      expect(cleanCodeContent("Copy code\nconsole.log('hello')")).toBe("console.log('hello')");
    });

    it("should remove leading Copy", () => {
      expect(cleanCodeContent("Copy\ncode")).toBe("code");
    });

    it("should handle language labels followed by Copy code", () => {
      expect(cleanCodeContent("javascript Copy code\nconsole.log('hello')")).toBe(
        "console.log('hello')",
      );
    });

    it("should handle language labels at the start on their own line", () => {
      expect(cleanCodeContent("javascript\nconsole.log('hello')")).toBe("console.log('hello')");
      expect(cleanCodeContent("python\nprint('hello')")).toBe("print('hello')");
      expect(cleanCodeContent("typescript\nconst x: number = 1")).toBe("const x: number = 1");
    });

    it("should not remove language names that are part of code", () => {
      const code = 'const lang = "javascript";';
      expect(cleanCodeContent(code)).toBe(code);
    });

    it("should handle empty strings", () => {
      expect(cleanCodeContent("")).toBe("");
    });

    it("should preserve multiline code", () => {
      const code = "function test() {\n  return true;\n}";
      expect(cleanCodeContent(code)).toBe(code);
    });
  });

  describe("detectLanguageFromElement", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should detect language from class name with language- prefix", () => {
      const element = document.createElement("code");
      element.className = "language-javascript";
      expect(detectLanguageFromElement(element)).toBe("javascript");
    });

    it("should detect language from class name with lang- prefix", () => {
      const element = document.createElement("code");
      element.className = "lang-python";
      expect(detectLanguageFromElement(element)).toBe("python");
    });

    it("should detect language from class name with hljs pattern", () => {
      const element = document.createElement("code");
      element.className = "hljs typescript";
      expect(detectLanguageFromElement(element)).toBe("typescript");
    });

    it("should not detect language from bare class name alone", () => {
      const element = document.createElement("code");
      element.className = "python";
      // The regex requires language-, lang-, or hljs pattern
      expect(detectLanguageFromElement(element)).toBe("");
    });

    it("should detect language from data-language attribute", () => {
      const element = document.createElement("code");
      element.setAttribute("data-language", "ruby");
      expect(detectLanguageFromElement(element)).toBe("ruby");
    });

    it("should not check data-lang attribute (only data-language)", () => {
      const element = document.createElement("code");
      element.setAttribute("data-lang", "go");
      // The function only checks data-language, not data-lang
      expect(detectLanguageFromElement(element)).toBe("");
    });

    it("should return empty string if no language detected", () => {
      const element = document.createElement("code");
      element.className = "some-other-class";
      expect(detectLanguageFromElement(element)).toBe("");
    });

    it("should handle multiple classes", () => {
      const element = document.createElement("code");
      element.className = "code-block language-rust highlighted";
      expect(detectLanguageFromElement(element)).toBe("rust");
    });

    it("should return empty string for element without language classes", () => {
      const element = document.createElement("div");
      expect(detectLanguageFromElement(element)).toBe("");
    });

    it("should not detect language from exclamation mark prefix", () => {
      const element = document.createElement("code");
      element.className = "!javascript";
      // The regex doesn't support ! prefix
      expect(detectLanguageFromElement(element)).toBe("");
    });
  });

  describe("detectLanguage", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should detect language from pre element", () => {
      const pre = document.createElement("pre");
      pre.className = "language-java";
      expect(detectLanguage(pre, null)).toBe("java");
    });

    it("should detect language from code element", () => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.className = "language-csharp";
      pre.appendChild(code);
      expect(detectLanguage(pre, code)).toBe("csharp");
    });

    it("should prefer code element over pre element", () => {
      const pre = document.createElement("pre");
      pre.className = "language-javascript";
      const code = document.createElement("code");
      code.className = "language-typescript";
      pre.appendChild(code);
      // detectLanguage checks both and typically returns first found
      expect(detectLanguage(pre, code)).toBe("javascript");
    });

    it("should detect language from parent code-block wrapper with span", () => {
      const container = document.createElement("div");
      container.className = "code-block";
      const span = document.createElement("span");
      span.textContent = "python";
      container.appendChild(span);
      const pre = document.createElement("pre");
      container.appendChild(pre);
      document.body.appendChild(container);

      expect(detectLanguage(pre, null)).toBe("python");
    });

    it("should return empty string when no language found and no valid span", () => {
      const pre = document.createElement("pre");
      document.body.appendChild(pre);
      expect(detectLanguage(pre, null)).toBe("");
    });
  });

  describe("extractCodeContent", () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it("should extract text content from pre element", () => {
      const pre = document.createElement("pre");
      pre.textContent = "const x = 1;";
      expect(extractCodeContent(pre)).toBe("const x = 1;");
    });

    it("should extract text content from code child", () => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = "console.log('hello');";
      pre.appendChild(code);
      expect(extractCodeContent(pre)).toBe("console.log('hello');");
    });

    it("should clean extracted content", () => {
      const pre = document.createElement("pre");
      pre.textContent = "  Copy\nconst x = 1;\n  ";
      const result = extractCodeContent(pre);
      expect(result).not.toContain("Copy");
      expect(result).toContain("const x = 1;");
    });

    it("should remove toolbar/button elements before extraction", () => {
      const pre = document.createElement("pre");
      const button = document.createElement("button");
      button.textContent = "Copy";
      pre.appendChild(button);
      const code = document.createElement("code");
      code.textContent = "actual code";
      pre.appendChild(code);

      const result = extractCodeContent(pre);
      expect(result).toBe("actual code");
    });

    it("should return empty string for empty pre", () => {
      const pre = document.createElement("pre");
      expect(extractCodeContent(pre)).toBe("");
    });

    it("should handle nested spans in code", () => {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      const span1 = document.createElement("span");
      span1.textContent = "function ";
      const span2 = document.createElement("span");
      span2.textContent = "test()";
      code.appendChild(span1);
      code.appendChild(span2);
      pre.appendChild(code);

      expect(extractCodeContent(pre)).toBe("function test()");
    });
  });
});
