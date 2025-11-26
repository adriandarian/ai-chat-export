import { useEffect, useState, useRef, useCallback } from 'react';
import { Message, SelectedElement } from '../types';
import { Trash2, FileDown, X, MousePointer2, Check, ChevronDown, FileText, Code, FileJson, MessageSquare, Loader2, FileType } from 'lucide-react';

import { generateExportHTML, downloadBlob, downloadPDF, generateExportMarkdown } from '../utils/export';

type ExportFormat = 'html' | 'pdf' | 'json' | 'markdown';
type SelectionMode = 'element' | 'conversation';

export const ContentApp = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('element');
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [hoverRect, setHoverRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  
  const hoveredElRef = useRef<HTMLElement | null>(null);
  const isActiveRef = useRef(isActive);
  const selectionModeRef = useRef<SelectionMode>(selectionMode);

  useEffect(() => {
    isActiveRef.current = isActive;
    selectionModeRef.current = selectionMode;
    if (!isActive) {
      setHoverRect(null);
      hoveredElRef.current = null;
    }
  }, [isActive, selectionMode]);

  // Helper function to find the main conversation container that holds ALL messages
  // This is designed to capture entire conversations from first prompt to last response
  const findConversationContainer = (element: HTMLElement): HTMLElement | null => {
    // Common patterns for chat/conversation containers (expanded list)
    const conversationIndicators = [
      'conversation', 'chat', 'message', 'thread', 'exchange',
      'dialogue', 'discussion', 'history', 'messages', 'chat-container',
      'group', 'conversation-turn', 'message-group', 'chat-message',
      'conversations', 'chat-history', 'message-list', 'thread-container',
      'conversation-container', 'chat-wrapper', 'messages-container'
    ];
    
    // Look up the DOM tree to find the main conversation container
    let current: HTMLElement | null = element;
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;
    
    // Check up to 20 levels up to find the root conversation container
    for (let i = 0; i < 20 && current; i++) {
      const className = current.className?.toLowerCase() || '';
      const id = current.id?.toLowerCase() || '';
      const tagName = current.tagName?.toLowerCase() || '';
      const computed = window.getComputedStyle(current);
      const rect = current.getBoundingClientRect();
      
      let score = 0;
      
      // Strong indicators - these are likely the main conversation container
      conversationIndicators.forEach(indicator => {
        if (className.includes(indicator) || id.includes(indicator)) {
          score += 5; // Very high weight for conversation indicators
        }
      });
      
      // Count message-like elements (prompts, responses, turns)
      const messageSelectors = [
        '[class*="message"]',
        '[class*="chat"]',
        '[class*="turn"]',
        '[class*="prompt"]',
        '[class*="response"]',
        '[class*="user"]',
        '[class*="assistant"]',
        '[role="article"]',
        '[data-message-id]',
        '[data-turn-id]'
      ];
      
      let messageCount = 0;
      const currentEl = current; // Capture for closure
      messageSelectors.forEach(selector => {
        try {
          messageCount += currentEl.querySelectorAll(selector).length;
        } catch (e) {
          // Ignore invalid selectors
        }
      });
      
      // Strong preference for containers with many messages (entire conversation)
      if (messageCount >= 2) {
        score += Math.min(messageCount * 2, 30); // Very high weight for many messages
      }
      
      // Prefer scrollable containers (these often contain the full conversation)
      if (computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
        score += 10; // High weight for scrollable containers
        // Check scroll height vs visible height - if much larger, likely contains full conversation
        if (current.scrollHeight > current.clientHeight * 1.5) {
          score += 15; // Very high weight for containers with significant scrollable content
        }
      }
      
      // Prefer elements with many descendants (likely contains entire conversation)
      const descendantCount = current.querySelectorAll('*').length;
      if (descendantCount > 20) {
        score += Math.min(descendantCount / 20, 10);
      }
      
      // Prefer elements that span a large vertical area (full conversation height)
      // Even if not all visible, we want the container that holds everything
      const viewportHeight = window.innerHeight;
      const scrollHeight = current.scrollHeight || rect.height;
      
      // Prefer containers that are tall (contain many messages)
      if (scrollHeight > viewportHeight * 0.5) {
        score += 8;
      }
      if (scrollHeight > viewportHeight * 2) {
        score += 10; // Very tall = likely full conversation
      }
      
      // Prefer certain semantic elements that often contain conversations
      if (['article', 'section', 'main'].includes(tagName)) {
        score += 3;
      }
      
      // Avoid very small elements (not the main container)
      if (rect.height < 100 && scrollHeight < 200) {
        score -= 5;
      }
      
      // Prefer elements that are direct children of body or main content areas
      if (current.parentElement) {
        const parentTag = current.parentElement.tagName?.toLowerCase();
        if (parentTag === 'body' || parentTag === 'main') {
          score += 5;
        }
      }
      
      // Check for data attributes that indicate conversation containers
      const dataAttrs = Array.from(current.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => attr.name.toLowerCase());
      if (dataAttrs.some(attr => attr.includes('conversation') || attr.includes('chat') || attr.includes('thread'))) {
        score += 8;
      }
      
      // Final scoring - prefer containers with high scores
      if (score > bestScore) {
        // Lower threshold - we want to find the conversation container
        // But still require some evidence it's a conversation container
        if (score >= 10 || (messageCount >= 2 && score >= 5)) {
          bestScore = score;
          bestMatch = current;
        }
      }
      
      current = current.parentElement;
    }
    
    // If we found a match, verify it's reasonable
    if (bestMatch) {
      const finalRect = bestMatch.getBoundingClientRect();
      const finalScrollHeight = bestMatch.scrollHeight || finalRect.height;
      
      // Ensure it's not too small
      if (finalScrollHeight < 100) {
        // Too small, try to find a parent
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

  // Function to scroll through and collect ALL conversation content
  // This handles virtual scrolling where content loads as you scroll
  const collectFullConversation = useCallback(async (
    container: HTMLElement,
    onProgress?: (msg: string) => void
  ): Promise<string> => {
    onProgress?.('Preparing to collect conversation...');
    
    // Find the scrollable element - it might be the container or a parent
    let scrollableEl: HTMLElement | null = container;
    
    // Check if container itself is scrollable
    const isScrollable = (el: HTMLElement): boolean => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && 
             el.scrollHeight > el.clientHeight;
    };
    
    // Find the scrollable parent if container isn't scrollable
    if (!isScrollable(container)) {
      let parent = container.parentElement;
      while (parent && parent !== document.body) {
        if (isScrollable(parent)) {
          scrollableEl = parent;
          break;
        }
        parent = parent.parentElement;
      }
      // Check document.documentElement as last resort
      if (!scrollableEl || !isScrollable(scrollableEl)) {
        if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
          scrollableEl = document.documentElement;
        }
      }
    }
    
    if (!scrollableEl) {
      // Not scrollable, just return the content as-is
      return container.outerHTML;
    }
    
    // Store original scroll position
    const originalScrollTop = scrollableEl.scrollTop;
    const scrollHeight = scrollableEl.scrollHeight;
    const clientHeight = scrollableEl.clientHeight;
    
    // If content is small enough, just return it
    if (scrollHeight <= clientHeight * 1.2) {
      return container.outerHTML;
    }
    
    onProgress?.('Scrolling to start of conversation...');
    
    // Scroll to the very top first
    scrollableEl.scrollTop = 0;
    await new Promise(r => setTimeout(r, 500));
    
    // Collect unique message elements as we scroll
    const collectedMessages: Map<string, { html: string; order: number }> = new Map();
    let messageOrder = 0;
    
    // Common selectors for chat messages across platforms
    const messageSelectors = [
      '[data-message-id]',
      '[data-testid*="conversation-turn"]',
      '[class*="ConversationItem"]',
      '[class*="message-"]',
      '[class*="chat-message"]',
      '[class*="Message_"]',
      '[role="article"]',
      'article[data-scroll-anchor]',
      '[class*="group/conversation-turn"]',
      // Claude specific
      '[class*="prose"]',
      // ChatGPT specific  
      '[data-message-author-role]',
      // General
      '.message',
      '.chat-turn',
    ];
    
    // Function to extract unique identifier for a message
    const getMessageKey = (el: HTMLElement): string => {
      // Try data attributes first
      const dataId = el.getAttribute('data-message-id') || 
                     el.getAttribute('data-testid') ||
                     el.getAttribute('data-scroll-anchor');
      if (dataId) return dataId;
      
      // Fall back to content hash (first 100 chars of text content)
      const textContent = el.textContent?.slice(0, 200) || '';
      return `${el.tagName}-${textContent.length}-${textContent.slice(0, 50)}`;
    };
    
    // Function to collect visible messages
    const collectVisibleMessages = () => {
      for (const selector of messageSelectors) {
        try {
          const messages = container.querySelectorAll(selector);
          messages.forEach((msg) => {
            const el = msg as HTMLElement;
            const key = getMessageKey(el);
            if (!collectedMessages.has(key)) {
              // Clone and capture computed styles
              const clone = el.cloneNode(true) as HTMLElement;
              
              // Apply computed styles inline for better export
              const applyStyles = (source: HTMLElement, target: HTMLElement) => {
                const comp = window.getComputedStyle(source);
                const importantStyles = [
                  'color', 'background-color', 'background', 'font-family', 'font-size',
                  'font-weight', 'line-height', 'padding', 'margin', 'border', 'border-radius',
                  'display', 'flex-direction', 'gap', 'white-space'
                ];
                const styleStr = importantStyles
                  .map(p => {
                    const val = comp.getPropertyValue(p);
                    if (val && val !== 'none' && val !== 'normal' && val !== 'rgba(0, 0, 0, 0)') {
                      return `${p}: ${val}`;
                    }
                    return null;
                  })
                  .filter(Boolean)
                  .join('; ');
                if (styleStr) {
                  target.setAttribute('style', (target.getAttribute('style') || '') + '; ' + styleStr);
                }
              };
              
              applyStyles(el, clone);
              
              collectedMessages.set(key, {
                html: clone.outerHTML,
                order: messageOrder++
              });
            }
          });
        } catch (e) {
          // Invalid selector, skip
        }
      }
    };
    
    // If no specific messages found, fall back to direct children
    const collectDirectChildren = () => {
      const children = container.children;
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        const key = `child-${i}-${el.tagName}-${(el.textContent?.slice(0, 50) || '')}`;
        if (!collectedMessages.has(key)) {
          collectedMessages.set(key, {
            html: el.outerHTML,
            order: messageOrder++
          });
        }
      }
    };
    
    // Scroll through the entire conversation
    const scrollStep = clientHeight * 0.7; // Overlap for safety
    let currentScroll = 0;
    let lastMessageCount = 0;
    let stableCount = 0;
    
    while (currentScroll < scrollHeight + clientHeight) {
      onProgress?.(`Collecting messages... (${collectedMessages.size} found)`);
      
      scrollableEl.scrollTop = currentScroll;
      await new Promise(r => setTimeout(r, 300)); // Wait for virtual content to load
      
      collectVisibleMessages();
      
      // Check if we found any messages with selectors
      if (collectedMessages.size === 0) {
        collectDirectChildren();
      }
      
      // Check if we're done (no new messages after several scrolls)
      if (collectedMessages.size === lastMessageCount) {
        stableCount++;
        if (stableCount > 3) break;
      } else {
        stableCount = 0;
        lastMessageCount = collectedMessages.size;
      }
      
      currentScroll += scrollStep;
      
      // Update scroll height in case content loaded dynamically
      const newScrollHeight = scrollableEl.scrollHeight;
      if (newScrollHeight > scrollHeight) {
        // More content appeared, continue scrolling
      }
    }
    
    // Do one final collection at the very bottom
    scrollableEl.scrollTop = scrollableEl.scrollHeight;
    await new Promise(r => setTimeout(r, 500));
    collectVisibleMessages();
    if (collectedMessages.size === 0) {
      collectDirectChildren();
    }
    
    onProgress?.(`Collected ${collectedMessages.size} messages. Restoring view...`);
    
    // Restore original scroll position
    scrollableEl.scrollTop = originalScrollTop;
    
    // If we collected individual messages, combine them
    if (collectedMessages.size > 0) {
      // Sort by order and combine
      const sortedMessages = Array.from(collectedMessages.values())
        .sort((a, b) => a.order - b.order)
        .map(m => m.html);
      
      // Get container styles to wrap the messages
      const containerStyles = window.getComputedStyle(container);
      const wrapperStyles = [
        `display: ${containerStyles.display}`,
        `flex-direction: ${containerStyles.flexDirection}`,
        `gap: ${containerStyles.gap}`,
        `padding: ${containerStyles.padding}`,
        `background-color: ${containerStyles.backgroundColor}`,
        `color: ${containerStyles.color}`,
        `font-family: ${containerStyles.fontFamily}`,
      ].join('; ');
      
      return `<div class="${container.className}" style="${wrapperStyles}">${sortedMessages.join('\n')}</div>`;
    }
    
    // Fallback: return container as-is
    return container.outerHTML;
  }, []);

  useEffect(() => {
    // Check if extension context is valid
    const isContextValid = () => {
      try {
        return chrome?.runtime?.id !== undefined;
      } catch (e) {
        return false;
      }
    };

    if (!isContextValid()) {
      console.warn('Extension context invalidated, message listener not attached');
      return;
    }

    const handleMessage = (msg: Message) => {
      if (msg.type === 'TOGGLE_SELECTION_MODE') {
        const newState = msg.payload !== undefined ? msg.payload : !isActiveRef.current;
        setIsActive(newState);
      }
    };

    try {
    chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        try {
          chrome.runtime.onMessage.removeListener(handleMessage);
        } catch (e) {
          // Context might be invalidated during cleanup, ignore
        }
      };
    } catch (e) {
      console.error('Failed to attach message listener:', e);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const getExtensionRoot = () => document.getElementById('ai-chat-export-root');

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const root = getExtensionRoot();
      if (root === target) return;

      let elementToHighlight = target;
      
      // In conversation mode, try to find the conversation container
      if (selectionModeRef.current === 'conversation') {
        const container = findConversationContainer(target);
        if (container) {
          elementToHighlight = container;
        }
      }
      
      hoveredElRef.current = elementToHighlight;
      const rect = elementToHighlight.getBoundingClientRect();
      setHoverRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    const handleClick = async (e: MouseEvent) => {
      const root = getExtensionRoot();
      const path = e.composedPath();
      if (path.includes(root as EventTarget)) return;

      if (isActiveRef.current && hoveredElRef.current) {
        e.preventDefault();
        e.stopPropagation();
        
        let el = hoveredElRef.current;
        let content = '';
        
        // In conversation mode, use the conversation container and collect all content
        if (selectionModeRef.current === 'conversation') {
          const container = findConversationContainer(hoveredElRef.current);
          if (container) {
            el = container;
            
            // Show collecting indicator
            setIsExporting(true);
            setExportProgress('Collecting conversation...');
            
            try {
              // Scroll through and collect all conversation content
              content = await collectFullConversation(container, (msg) => {
                setExportProgress(msg);
              });
            } catch (err) {
              console.error('Error collecting conversation:', err);
              content = el.outerHTML; // Fallback
            } finally {
              setIsExporting(false);
              setExportProgress('');
            }
          } else {
            content = el.outerHTML;
          }
        } else {
          content = el.outerHTML;
        }
        
        // Check if this element is already selected (avoid duplicates)
        const isAlreadySelected = selectedElements.some(
          selected => selected.originalId === el.id
        );
        
        if (!isAlreadySelected && content) {
          // Capture computed styles for better export
          const computed = window.getComputedStyle(el);
          const computedStyles: { [key: string]: string } = {};
          
          // Capture important visual properties
          const importantProps = [
            'color', 'background-color', 'background', 'font-family', 'font-size',
            'font-weight', 'line-height', 'padding', 'margin', 'border',
            'border-radius', 'display', 'flex-direction', 'gap', 'width', 'max-width',
            'text-align', 'opacity', 'box-shadow'
          ];
          
          importantProps.forEach(prop => {
            const value = computed.getPropertyValue(prop);
            if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== 'rgba(0, 0, 0, 0)') {
              computedStyles[prop] = value;
            }
          });
          
          const newElement: SelectedElement = {
            id: crypto.randomUUID(),
            originalId: el.id,
            tagName: el.tagName.toLowerCase(),
            className: typeof el.className === 'string' ? el.className : '',
            xpath: '',
            content: content,
            computedStyles: Object.keys(computedStyles).length > 0 ? computedStyles : undefined
          };

          setSelectedElements(prev => [...prev, newElement]);
        }
      }
    };

    const handleScroll = () => {
      if (hoveredElRef.current) {
        const rect = hoveredElRef.current.getBoundingClientRect();
        setHoverRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
    };

    window.addEventListener('mouseover', handleMouseOver, { capture: true });
    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('mouseover', handleMouseOver, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isActive]);

  const removeElement = (id: string) => {
    setSelectedElements(prev => prev.filter(el => el.id !== id));
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      if (format === 'html') {
        setExportProgress('Generating HTML...');
        const html = generateExportHTML(selectedElements);
        await downloadBlob(html, `chat-export-${Date.now()}.html`, 'text/html');
      } else if (format === 'json') {
        setExportProgress('Generating JSON...');
        const json = JSON.stringify(selectedElements, null, 2);
        await downloadBlob(json, `chat-export-${Date.now()}.json`, 'application/json');
      } else if (format === 'markdown') {
        setExportProgress('Generating Markdown...');
        const markdown = generateExportMarkdown(selectedElements);
        await downloadBlob(markdown, `chat-export-${Date.now()}.md`, 'text/markdown');
      } else if (format === 'pdf') {
        setExportProgress('Generating PDF (this may take a moment)...');
        await downloadPDF(selectedElements, `chat-export-${Date.now()}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  if (!isActive && selectedElements.length === 0) return null;

  return (
    <div className="font-sans text-gray-800 pointer-events-none">
      {isActive && hoverRect && (
        <div
          className="fixed pointer-events-none z-[10000] border-2 border-blue-500 bg-blue-500/10 transition-all duration-75 ease-out rounded-sm"
          style={{
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
          }}
        />
      )}

      <div className="fixed bottom-4 right-4 z-[10001] bg-white shadow-2xl rounded-lg border border-gray-200 w-80 overflow-visible flex flex-col max-h-[500px] pointer-events-auto font-sans">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
            <h3 className="font-semibold text-sm">
              {isActive 
                ? (selectionMode === 'conversation' ? 'Selecting Conversations...' : 'Selecting Elements...')
                : 'Ready to Export'}
            </h3>
          </div>
          <button 
            onClick={() => {
              setIsActive(false);
              setSelectedElements([]);
            }}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        
        {isActive && (
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex gap-2">
            <button
              onClick={() => setSelectionMode('element')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                selectionMode === 'element'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              title="Select individual elements"
            >
              <MousePointer2 size={12} />
              Element
            </button>
            <button
              onClick={() => setSelectionMode('conversation')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                selectionMode === 'conversation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              title="Select entire conversations"
            >
              <MessageSquare size={12} />
              Conversation
            </button>
          </div>
        )}
        
        <div className="p-3 flex-1 overflow-y-auto min-h-[100px] max-h-[300px] bg-white">
          {selectedElements.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">
              {selectionMode === 'conversation' ? (
                <>
                  <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
                  <p className="font-medium mb-1">Select Entire Conversation</p>
                  <p className="text-xs">Hover over any message and click once to capture the full chat from first prompt to last response.</p>
                  <p className="text-xs mt-2 text-gray-500">This will capture everything, even if it spans hundreds of pages.</p>
                </>
              ) : (
                <>
              <MousePointer2 className="mx-auto mb-2 opacity-50" size={24} />
                  <p>Hover and click elements to select them individually.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedElements.map((el) => (
                <li key={el.id} className="bg-gray-50 p-2 rounded text-xs flex justify-between items-start group border border-transparent hover:border-blue-200">
                  <div className="truncate flex-1 pr-2">
                    <span className="font-mono font-bold text-blue-600 text-[10px] uppercase mr-2">{el.tagName}</span>
                    <span className="text-gray-600 inline truncate max-w-[150px] align-bottom" title={el.content.substring(0, 200)}>
                      {el.content.replace(/<[^>]*>?/gm, '').substring(0, 60)}...
                    </span>
                  </div>
                  <button 
                    onClick={() => removeElement(el.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-gray-50 flex flex-col gap-2 rounded-b-lg relative">
          {isExporting && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-b-lg">
              <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
              <span className="text-xs text-gray-600 font-medium text-center px-4">{exportProgress || 'Processing...'}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500 font-medium">{selectedElements.length} items selected</span>
            <button 
               className="text-xs text-red-500 hover:text-red-700 font-medium"
               onClick={() => setSelectedElements([])}
               disabled={selectedElements.length === 0 || isExporting}
             >
               Clear All
             </button>
          </div>

          {isActive ? (
             <button 
               className="w-full py-2 bg-slate-800 text-white rounded text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-2"
               onClick={() => setIsActive(false)}
             >
               <Check size={16} />
               Done Selecting
             </button>
          ) : (
            <div className="flex gap-2 relative">
               <button 
                 className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                 onClick={() => setIsActive(true)}
               >
                 Resume
               </button>
               
               <div className="flex-1 relative">
                 <button 
                   className="w-full py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   disabled={selectedElements.length === 0}
                   onClick={() => setShowExportMenu(!showExportMenu)}
                 >
                   <FileDown size={16} />
                   Export
                   <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                 </button>

                 {showExportMenu && (
                   <div className="absolute bottom-full right-0 mb-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                     <button 
                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                       onClick={() => handleExport('html')}
                     >
                       <Code size={14} className="text-blue-500" />
                       Export as HTML
                     </button>
                     <button 
                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
                       onClick={() => handleExport('pdf')}
                     >
                       <FileText size={14} className="text-red-500" />
                       Export as PDF
                     </button>
                     <button 
                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
                       onClick={() => handleExport('markdown')}
                     >
                       <FileType size={14} className="text-purple-500" />
                       Export as Markdown
                     </button>
                     <button 
                       className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
                       onClick={() => handleExport('json')}
                     >
                       <FileJson size={14} className="text-amber-500" />
                       Export as JSON
                     </button>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
