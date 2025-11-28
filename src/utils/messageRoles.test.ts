import { describe, it, expect, beforeEach } from "vitest";
import {
  isUserMessage,
  isAssistantMessage,
  detectMessageRole,
  guessRoleFromContent,
} from "./messageRoles";

describe("messageRoles", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("isUserMessage", () => {
    it("should return true for elements with data-message-author-role='user'", () => {
      const element = document.createElement("div");
      element.setAttribute("data-message-author-role", "user");
      expect(isUserMessage(element)).toBe(true);
    });

    it("should return true for elements with user class", () => {
      const element = document.createElement("div");
      element.className = "user-message";
      expect(isUserMessage(element)).toBe(true);
    });

    it("should check for user anywhere in class name", () => {
      const element = document.createElement("div");
      element.className = "some-user-turn";
      expect(isUserMessage(element)).toBe(true);
    });

    it("should return false for assistant messages", () => {
      const element = document.createElement("div");
      element.setAttribute("data-message-author-role", "assistant");
      expect(isUserMessage(element)).toBe(false);
    });

    it("should return false for elements without role indicators", () => {
      const element = document.createElement("div");
      element.className = "generic-message";
      expect(isUserMessage(element)).toBe(false);
    });

    it("should check parent elements for role", () => {
      const parent = document.createElement("div");
      parent.setAttribute("data-message-author-role", "user");
      const child = document.createElement("p");
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(isUserMessage(child)).toBe(true);
    });
  });

  describe("isAssistantMessage", () => {
    it("should return true for elements with data-message-author-role='assistant'", () => {
      const element = document.createElement("div");
      element.setAttribute("data-message-author-role", "assistant");
      expect(isAssistantMessage(element)).toBe(true);
    });

    it("should return true for elements with assistant in class name", () => {
      const element = document.createElement("div");
      element.className = "assistant-message";
      expect(isAssistantMessage(element)).toBe(true);
    });

    it("should return true for elements with agent-turn in class name", () => {
      const element = document.createElement("div");
      element.className = "agent-turn";
      expect(isAssistantMessage(element)).toBe(true);
    });

    it("should return true for elements with bot in class name", () => {
      const element = document.createElement("div");
      element.className = "bot-turn";
      expect(isAssistantMessage(element)).toBe(true);
    });

    it("should return false for user messages", () => {
      const element = document.createElement("div");
      element.setAttribute("data-message-author-role", "user");
      expect(isAssistantMessage(element)).toBe(false);
    });

    it("should return false for elements without role indicators", () => {
      const element = document.createElement("div");
      element.className = "generic-message";
      expect(isAssistantMessage(element)).toBe(false);
    });

    it("should check parent elements for role", () => {
      const parent = document.createElement("div");
      parent.setAttribute("data-message-author-role", "assistant");
      const child = document.createElement("span");
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(isAssistantMessage(child)).toBe(true);
    });
  });

  describe("detectMessageRole", () => {
    it('should return "user" for user messages', () => {
      const element = document.createElement("div");
      element.setAttribute("data-message-author-role", "user");
      expect(detectMessageRole(element)).toBe("user");
    });

    it('should return "assistant" for assistant messages', () => {
      const element = document.createElement("div");
      element.setAttribute("data-message-author-role", "assistant");
      expect(detectMessageRole(element)).toBe("assistant");
    });

    it("should return undefined for elements without clear role", () => {
      const element = document.createElement("div");
      element.className = "generic-content";
      expect(detectMessageRole(element)).toBeUndefined();
    });

    it("should detect user role from user-message class", () => {
      const element = document.createElement("div");
      element.className = "user-message-bubble";
      expect(detectMessageRole(element)).toBe("user");
    });

    it("should return undefined for chatgpt-response class (not matched)", () => {
      const element = document.createElement("div");
      element.className = "chatgpt-response";
      // This doesn't match assistant, agent-turn, or bot
      expect(detectMessageRole(element)).toBeUndefined();
    });
  });

  describe("guessRoleFromContent", () => {
    it('should return "user" for short content without code', () => {
      const element = document.createElement("div");
      element.textContent = "Hello, how are you?";
      expect(guessRoleFromContent(element)).toBe("user");
    });

    it('should return "assistant" for content with code blocks', () => {
      const element = document.createElement("div");
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = "console.log('hello');";
      pre.appendChild(code);
      element.appendChild(pre);
      expect(guessRoleFromContent(element)).toBe("assistant");
    });

    it('should return "assistant" for content over 500 chars', () => {
      const element = document.createElement("div");
      // Create content that's definitely over 500 characters
      element.textContent =
        "This is a longer response that contains detailed explanations. " +
        "It goes on for quite a while and provides comprehensive information " +
        "about the topic at hand. This is the kind of response you might expect " +
        "from an AI assistant that is trying to be helpful and thorough. " +
        "We need to make sure this text is long enough to exceed the 500 character " +
        "threshold that the function uses to determine if content is likely from " +
        "an assistant. Adding more text here to ensure we cross that boundary. " +
        "More explanatory content follows to pad this out sufficiently.";
      expect(guessRoleFromContent(element)).toBe("assistant");
    });

    it('should return "user" for question-like content under 500 chars', () => {
      const element = document.createElement("div");
      element.textContent = "Can you help me with this problem?";
      expect(guessRoleFromContent(element)).toBe("user");
    });

    it('should return "user" for short ambiguous content', () => {
      const element = document.createElement("div");
      element.textContent = "Okay.";
      // Short content without code blocks returns user
      expect(guessRoleFromContent(element)).toBe("user");
    });

    it('should return "user" for content with multiple paragraphs but under 500 chars', () => {
      const element = document.createElement("div");
      const p1 = document.createElement("p");
      p1.textContent = "First short para.";
      const p2 = document.createElement("p");
      p2.textContent = "Second short para.";
      element.appendChild(p1);
      element.appendChild(p2);
      // Total chars under 500, no code blocks
      expect(guessRoleFromContent(element)).toBe("user");
    });

    it('should return "user" for content with lists but under 500 chars', () => {
      const element = document.createElement("div");
      const ul = document.createElement("ul");
      const li1 = document.createElement("li");
      li1.textContent = "First item";
      const li2 = document.createElement("li");
      li2.textContent = "Second item";
      ul.appendChild(li1);
      ul.appendChild(li2);
      element.appendChild(ul);
      // Short content without code blocks returns user
      expect(guessRoleFromContent(element)).toBe("user");
    });
  });
});
