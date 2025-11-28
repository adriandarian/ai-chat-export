import { describe, it, expect } from "vitest";
import { highlightCode } from "./syntaxHighlighting";

describe("syntaxHighlighting", () => {
  describe("highlightCode", () => {
    describe("HTML escaping", () => {
      it("should escape HTML entities", () => {
        const result = highlightCode("<div>&amp;</div>", "text");
        expect(result).toContain("&lt;");
        expect(result).toContain("&gt;");
        expect(result).toContain("&amp;");
      });

      it("should escape angle brackets", () => {
        const result = highlightCode("a < b && b > c", "text");
        expect(result).toContain("&lt;");
        expect(result).toContain("&gt;");
      });
    });

    describe("JSON highlighting", () => {
      it("should highlight JSON keys in pink", () => {
        const result = highlightCode('{"name": "value"}', "json");
        expect(result).toContain('style="color: #f472b6;"'); // key color
        expect(result).toContain('"name"');
      });

      it("should highlight JSON string values in green", () => {
        const result = highlightCode('{"key": "value"}', "json");
        expect(result).toContain('style="color: #4ade80;"'); // value color
      });

      it("should highlight JSON numbers", () => {
        const result = highlightCode('{"count": 42}', "json");
        expect(result).toContain('style="color: #b5cea8;"');
        expect(result).toContain("42");
      });

      it("should highlight JSON booleans", () => {
        const result = highlightCode('{"active": true, "deleted": false}', "json");
        expect(result).toContain('style="color: #569cd6;"');
        expect(result).toContain("true");
        expect(result).toContain("false");
      });

      it("should highlight JSON null", () => {
        const result = highlightCode('{"data": null}', "json");
        expect(result).toContain('style="color: #569cd6;"');
        expect(result).toContain("null");
      });
    });

    describe("JavaScript/TypeScript highlighting", () => {
      it("should highlight keywords", () => {
        const result = highlightCode("const x = 1;", "javascript");
        expect(result).toContain('style="color: #569cd6;"');
        expect(result).toContain("const");
      });

      it("should highlight strings", () => {
        const result = highlightCode('const msg = "hello";', "javascript");
        expect(result).toContain('style="color: #ce9178;"');
        expect(result).toContain('"hello"');
      });

      it("should highlight single-line comments", () => {
        const result = highlightCode("// This is a comment", "javascript");
        expect(result).toContain('style="color: #6a9955;"');
        expect(result).toContain("// This is a comment");
      });

      it("should highlight multi-line comments", () => {
        const result = highlightCode("/* multi\nline */", "javascript");
        expect(result).toContain('style="color: #6a9955;"');
      });

      it("should highlight numbers", () => {
        const result = highlightCode("const x = 42;", "javascript");
        expect(result).toContain('style="color: #b5cea8;"');
        expect(result).toContain("42");
      });

      it("should highlight TypeScript with ts language", () => {
        const result = highlightCode("const x: number = 1;", "ts");
        expect(result).toContain('style="color: #569cd6;"');
        expect(result).toContain("const");
      });

      it("should highlight js shorthand", () => {
        const result = highlightCode("function test() {}", "js");
        expect(result).toContain('style="color: #569cd6;"');
        expect(result).toContain("function");
      });

      it("should highlight template literals", () => {
        const result = highlightCode("const s = `template`;", "javascript");
        expect(result).toContain('style="color: #ce9178;"');
        expect(result).toContain("`template`");
      });

      it("should highlight common keywords", () => {
        const keywords = [
          "const",
          "let",
          "var",
          "function",
          "return",
          "if",
          "else",
          "for",
          "while",
          "class",
          "import",
          "export",
          "from",
          "async",
          "await",
          "try",
          "catch",
          "throw",
          "new",
          "this",
          "typeof",
          "instanceof",
        ];

        keywords.forEach((keyword) => {
          const result = highlightCode(keyword, "javascript");
          expect(result).toContain('style="color: #569cd6;"');
        });
      });
    });

    describe("Python highlighting", () => {
      it("should highlight keywords", () => {
        const result = highlightCode("def test():\n    return True", "python");
        expect(result).toContain('style="color: #569cd6;"');
        expect(result).toContain("def");
        expect(result).toContain("return");
        expect(result).toContain("True");
      });

      it("should highlight strings", () => {
        const result = highlightCode('message = "hello"', "python");
        expect(result).toContain('style="color: #ce9178;"');
      });

      it("should highlight comments", () => {
        const result = highlightCode("# This is a comment", "python");
        expect(result).toContain('style="color: #6a9955;"');
      });

      it("should highlight triple-quoted strings", () => {
        const result = highlightCode('"""docstring"""', "python");
        expect(result).toContain('style="color: #ce9178;"');
      });

      it("should highlight py shorthand", () => {
        const result = highlightCode("print('hello')", "py");
        expect(result).toContain('style="color: #ce9178;"');
      });

      it("should highlight Python keywords", () => {
        const keywords = [
          "def",
          "class",
          "if",
          "elif",
          "else",
          "for",
          "while",
          "return",
          "import",
          "from",
          "as",
          "try",
          "except",
          "raise",
          "with",
          "lambda",
          "True",
          "False",
          "None",
          "and",
          "or",
          "not",
          "in",
          "is",
        ];

        keywords.forEach((keyword) => {
          const result = highlightCode(keyword, "python");
          expect(result).toContain('style="color: #569cd6;"');
        });
      });
    });

    describe("Bash/Shell highlighting", () => {
      it("should highlight strings", () => {
        const result = highlightCode('echo "hello"', "bash");
        expect(result).toContain('style="color: #ce9178;"');
      });

      it("should highlight variables", () => {
        const result = highlightCode("echo $HOME", "bash");
        expect(result).toContain('style="color: #9cdcfe;"');
        expect(result).toContain("$HOME");
      });

      it("should highlight variables with braces", () => {
        const result = highlightCode("echo ${PATH}", "bash");
        expect(result).toContain('style="color: #9cdcfe;"');
        expect(result).toContain("${PATH}");
      });

      it("should highlight comments", () => {
        const result = highlightCode("# comment", "bash");
        expect(result).toContain('style="color: #6a9955;"');
      });

      it("should work with sh language", () => {
        const result = highlightCode("echo $VAR", "sh");
        expect(result).toContain('style="color: #9cdcfe;"');
      });

      it("should work with shell language", () => {
        const result = highlightCode("echo $VAR", "shell");
        expect(result).toContain('style="color: #9cdcfe;"');
      });

      it("should work with zsh language", () => {
        const result = highlightCode("echo $VAR", "zsh");
        expect(result).toContain('style="color: #9cdcfe;"');
      });
    });

    describe("HTML/XML highlighting", () => {
      it("should highlight escaped tags", () => {
        const result = highlightCode("<div>content</div>", "html");
        // HTML is escaped first, so < becomes &lt;
        // Then the regex &lt;\/?[\w-]+ matches &lt;div and &lt;/div
        expect(result).toContain("&lt;div");
        expect(result).toContain("span");
      });

      it("should highlight attributes", () => {
        const result = highlightCode('<div class="test">', "html");
        // The attribute regex matches \s[\w-]+= pattern
        expect(result).toContain("class");
      });

      it("should highlight attribute values", () => {
        const result = highlightCode('<div id="main">', "html");
        expect(result).toContain('style="color: #ce9178;"');
        expect(result).toContain("main");
      });

      it("should work with xml language", () => {
        const result = highlightCode("<element>text</element>", "xml");
        expect(result).toContain("&lt;element");
        expect(result).toContain("span");
      });

      it("should work with svg language", () => {
        const result = highlightCode('<svg width="100">', "svg");
        expect(result).toContain("&lt;svg");
        expect(result).toContain("span");
      });
    });

    describe("CSS highlighting", () => {
      it("should highlight selectors", () => {
        const result = highlightCode(".class { }", "css");
        // CSS regex ^([^{]+)\{ matches selector before brace
        expect(result).toContain(".class");
        expect(result).toContain("span");
      });

      it("should highlight properties", () => {
        const result = highlightCode("div { color: red; }", "css");
        // Property regex ([\w-]+): matches property name
        expect(result).toContain("color");
        expect(result).toContain("span");
      });

      it("should highlight values", () => {
        const result = highlightCode("div { margin: 10px; }", "css");
        expect(result).toContain('style="color: #ce9178;"');
        expect(result).toContain("10px");
      });

      it("should work with scss language", () => {
        const result = highlightCode("$var: value;", "scss");
        // SCSS is treated like CSS
        expect(result).toBeDefined();
      });

      it("should work with less language", () => {
        const result = highlightCode("@var: value;", "less");
        // Less is treated like CSS
        expect(result).toBeDefined();
      });
    });

    describe("unsupported languages", () => {
      it("should return escaped code for unknown languages", () => {
        const result = highlightCode("<div>test</div>", "unknownlang");
        expect(result).toContain("&lt;div&gt;");
        expect(result).toContain("test");
        // Should not have highlighting spans
        expect(result).not.toContain("style=");
      });

      it("should still escape HTML for unknown languages", () => {
        const result = highlightCode("a & b", "random");
        expect(result).toContain("&amp;");
      });
    });

    describe("case insensitivity", () => {
      it("should handle uppercase language names", () => {
        const result = highlightCode("const x = 1;", "JAVASCRIPT");
        expect(result).toContain('style="color: #569cd6;"');
      });

      it("should handle mixed case language names", () => {
        const result = highlightCode("def test(): pass", "Python");
        expect(result).toContain('style="color: #569cd6;"');
      });
    });
  });
});
