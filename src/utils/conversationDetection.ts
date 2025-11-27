/**
 * Conversation Detection and Collection
 *
 * Utilities for detecting and collecting AI chat conversation containers
 * from various chat interfaces (ChatGPT, Claude, etc.)
 */

/**
 * Indicators in class/id that suggest a conversation container
 */
const CONVERSATION_INDICATORS = [
  "conversation",
  "chat",
  "message",
  "thread",
  "exchange",
  "dialogue",
  "discussion",
  "history",
  "messages",
  "chat-container",
  "group",
  "conversation-turn",
  "message-group",
  "chat-message",
  "conversations",
  "chat-history",
  "message-list",
  "thread-container",
  "conversation-container",
  "chat-wrapper",
  "messages-container",
];

/**
 * Selectors for finding individual messages within a container
 */
const MESSAGE_SELECTORS = [
  "[data-message-id]",
  '[data-testid*="conversation-turn"]',
  '[class*="ConversationItem"]',
  '[class*="message-"]',
  '[class*="chat-message"]',
  '[class*="Message_"]',
  '[role="article"]',
  "article[data-scroll-anchor]",
  '[class*="group/conversation-turn"]',
  '[class*="prose"]',
  "[data-message-author-role]",
  ".message",
  ".chat-turn",
];

/**
 * Check if an element is scrollable
 */
const isScrollable = (el: HTMLElement): boolean => {
  const style = window.getComputedStyle(el);
  return (
    (style.overflowY === "auto" || style.overflowY === "scroll") &&
    el.scrollHeight > el.clientHeight
  );
};

/**
 * Score an element for how likely it is to be a conversation container
 */
const scoreConversationElement = (element: HTMLElement): number => {
  const className = element.className?.toLowerCase() || "";
  const id = element.id?.toLowerCase() || "";
  const tagName = element.tagName?.toLowerCase() || "";
  const computed = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  let score = 0;

  // Check for conversation-related class/id names
  CONVERSATION_INDICATORS.forEach((indicator) => {
    if (className.includes(indicator) || id.includes(indicator)) {
      score += 5;
    }
  });

  // Count message-like elements inside
  let messageCount = 0;
  MESSAGE_SELECTORS.forEach((selector) => {
    try {
      messageCount += element.querySelectorAll(selector).length;
    } catch (_) {
      /* ignore invalid selectors */
    }
  });

  if (messageCount >= 2) {
    score += Math.min(messageCount * 2, 30);
  }

  // Scrollable containers are more likely to be the main conversation
  if (computed.overflowY === "auto" || computed.overflowY === "scroll") {
    score += 10;
    if (element.scrollHeight > element.clientHeight * 1.5) {
      score += 15;
    }
  }

  // More descendants = more content
  const descendantCount = element.querySelectorAll("*").length;
  if (descendantCount > 20) {
    score += Math.min(descendantCount / 20, 10);
  }

  // Prefer taller containers
  const viewportHeight = window.innerHeight;
  const scrollHeight = element.scrollHeight || rect.height;

  if (scrollHeight > viewportHeight * 0.5) score += 8;
  if (scrollHeight > viewportHeight * 2) score += 10;

  // Semantic tags get a bonus
  if (["article", "section", "main"].includes(tagName)) score += 3;

  // Too small = probably not it
  if (rect.height < 100 && scrollHeight < 200) score -= 5;

  // Direct child of body/main is more likely
  if (element.parentElement) {
    const parentTag = element.parentElement.tagName?.toLowerCase();
    if (parentTag === "body" || parentTag === "main") score += 5;
  }

  // Check data attributes for conversation hints
  const dataAttrs = Array.from(element.attributes)
    .filter((attr) => attr.name.startsWith("data-"))
    .map((attr) => attr.name.toLowerCase());
  if (
    dataAttrs.some(
      (attr) => attr.includes("conversation") || attr.includes("chat") || attr.includes("thread"),
    )
  ) {
    score += 8;
  }

  return score;
};

/**
 * Find the main conversation container starting from a clicked element
 */
export const findConversationContainer = (element: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = element;
  let bestMatch: HTMLElement | null = null;
  let bestScore = 0;

  // Walk up the tree looking for the best conversation container
  for (let i = 0; i < 20 && current; i++) {
    const score = scoreConversationElement(current);

    // Count messages to ensure we have content
    let messageCount = 0;
    MESSAGE_SELECTORS.forEach((selector) => {
      try {
        messageCount += current!.querySelectorAll(selector).length;
      } catch (_) {
        /* ignore */
      }
    });

    if (score > bestScore && (score >= 10 || (messageCount >= 2 && score >= 5))) {
      bestScore = score;
      bestMatch = current;
    }

    current = current.parentElement;
  }

  // If our best match is too small, try to find a larger parent
  if (bestMatch) {
    const finalRect = bestMatch.getBoundingClientRect();
    const finalScrollHeight = bestMatch.scrollHeight || finalRect.height;

    if (finalScrollHeight < 100) {
      let parent = bestMatch.parentElement;
      while (parent && parent !== document.body) {
        const parentScrollHeight = parent.scrollHeight || parent.getBoundingClientRect().height;
        if (parentScrollHeight > finalScrollHeight * 1.5) {
          bestMatch = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }

  return bestMatch;
};

/**
 * Find the scrollable element for a conversation container
 */
export const findScrollableElement = (container: HTMLElement): HTMLElement | null => {
  // Check if container itself is scrollable
  if (isScrollable(container)) {
    return container;
  }

  // Look for scrollable parent
  let parent = container.parentElement;
  while (parent && parent !== document.body) {
    if (isScrollable(parent)) {
      return parent;
    }
    parent = parent.parentElement;
  }

  // Fall back to document element if it's scrollable
  if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
    return document.documentElement;
  }

  return null;
};

/**
 * Generate a unique key for a message element (for deduplication)
 */
const getMessageKey = (el: HTMLElement): string => {
  const dataId =
    el.getAttribute("data-message-id") ||
    el.getAttribute("data-testid") ||
    el.getAttribute("data-scroll-anchor");
  if (dataId) return dataId;

  const textContent = el.textContent?.slice(0, 200) || "";
  return `${el.tagName}-${textContent.length}-${textContent.slice(0, 50)}`;
};

/**
 * Apply important computed styles to a cloned element
 */
const applyStylesToClone = (source: HTMLElement, target: HTMLElement): void => {
  const comp = window.getComputedStyle(source);
  const importantStyles = [
    "color",
    "background-color",
    "background",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "padding",
    "margin",
    "border",
    "border-radius",
    "display",
    "flex-direction",
    "gap",
    "white-space",
  ];
  const styleStr = importantStyles
    .map((p) => {
      const val = comp.getPropertyValue(p);
      if (val && val !== "none" && val !== "normal" && val !== "rgba(0, 0, 0, 0)") {
        return `${p}: ${val}`;
      }
      return null;
    })
    .filter(Boolean)
    .join("; ");
  if (styleStr) {
    target.setAttribute("style", (target.getAttribute("style") || "") + "; " + styleStr);
  }
};

/**
 * Collect all messages from a conversation by scrolling through it
 * This handles virtualized lists where not all messages are in the DOM at once.
 */
export const collectFullConversation = async (
  container: HTMLElement,
  onProgress?: (msg: string) => void,
): Promise<string> => {
  onProgress?.("Preparing to collect conversation...");

  // Find the scrollable element
  const scrollableEl = findScrollableElement(container);
  if (!scrollableEl) return container.outerHTML;

  const originalScrollTop = scrollableEl.scrollTop;
  const scrollHeight = scrollableEl.scrollHeight;
  const clientHeight = scrollableEl.clientHeight;

  // If content fits without scrolling, just return it
  if (scrollHeight <= clientHeight * 1.2) return container.outerHTML;

  onProgress?.("Scrolling to start of conversation...");

  // Scroll to top
  scrollableEl.scrollTop = 0;
  await new Promise((r) => setTimeout(r, 500));

  // Collect messages as we scroll
  const collectedMessages: Map<string, { html: string; order: number }> = new Map();
  let messageOrder = 0;

  const collectVisibleMessages = () => {
    for (const selector of MESSAGE_SELECTORS) {
      try {
        const messages = container.querySelectorAll(selector);
        messages.forEach((msg) => {
          const el = msg as HTMLElement;
          const key = getMessageKey(el);
          if (!collectedMessages.has(key)) {
            const clone = el.cloneNode(true) as HTMLElement;
            applyStylesToClone(el, clone);
            collectedMessages.set(key, { html: clone.outerHTML, order: messageOrder++ });
          }
        });
      } catch (_) {
        /* invalid selector */
      }
    }
  };

  const collectDirectChildren = () => {
    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      const key = `child-${i}-${el.tagName}-${el.textContent?.slice(0, 50) || ""}`;
      if (!collectedMessages.has(key)) {
        collectedMessages.set(key, { html: el.outerHTML, order: messageOrder++ });
      }
    }
  };

  // Scroll through and collect
  const scrollStep = clientHeight * 0.7;
  let currentScroll = 0;
  let lastMessageCount = 0;
  let stableCount = 0;

  while (currentScroll < scrollHeight + clientHeight) {
    onProgress?.(`Collecting messages... (${collectedMessages.size} found)`);

    scrollableEl.scrollTop = currentScroll;
    await new Promise((r) => setTimeout(r, 300));

    collectVisibleMessages();
    if (collectedMessages.size === 0) collectDirectChildren();

    if (collectedMessages.size === lastMessageCount) {
      stableCount++;
      if (stableCount > 3) break;
    } else {
      stableCount = 0;
      lastMessageCount = collectedMessages.size;
    }

    currentScroll += scrollStep;
  }

  // Scroll to end to catch any remaining messages
  scrollableEl.scrollTop = scrollableEl.scrollHeight;
  await new Promise((r) => setTimeout(r, 500));
  collectVisibleMessages();
  if (collectedMessages.size === 0) collectDirectChildren();

  onProgress?.(`Collected ${collectedMessages.size} messages. Restoring view...`);
  scrollableEl.scrollTop = originalScrollTop;

  if (collectedMessages.size > 0) {
    // Sort by collection order and join
    const sortedMessages = Array.from(collectedMessages.values())
      .sort((a, b) => a.order - b.order)
      .map((m) => m.html);

    // Wrap in a container with the original styles
    const containerStyles = window.getComputedStyle(container);
    const wrapperStyles = [
      `display: ${containerStyles.display}`,
      `flex-direction: ${containerStyles.flexDirection}`,
      `gap: ${containerStyles.gap}`,
      `padding: ${containerStyles.padding}`,
      `background-color: ${containerStyles.backgroundColor}`,
      `color: ${containerStyles.color}`,
      `font-family: ${containerStyles.fontFamily}`,
    ].join("; ");

    return `<div class="${container.className}" style="${wrapperStyles}">${sortedMessages.join("\n")}</div>`;
  }

  return container.outerHTML;
};
