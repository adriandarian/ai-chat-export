import { useEffect, useState, useRef, useCallback } from 'react';
import { Message, SelectedElement } from '../types';
import { SelectionOverlay, SelectionPanel, SelectionMode, ExportFormat } from '../components';
import { generateExportHTML, downloadBlob, downloadPDF, generateExportMarkdown } from '../utils/export';

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
  const findConversationContainer = (element: HTMLElement): HTMLElement | null => {
    const conversationIndicators = [
      'conversation', 'chat', 'message', 'thread', 'exchange',
      'dialogue', 'discussion', 'history', 'messages', 'chat-container',
      'group', 'conversation-turn', 'message-group', 'chat-message',
      'conversations', 'chat-history', 'message-list', 'thread-container',
      'conversation-container', 'chat-wrapper', 'messages-container'
    ];
    
    let current: HTMLElement | null = element;
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;
    
    for (let i = 0; i < 20 && current; i++) {
      const className = current.className?.toLowerCase() || '';
      const id = current.id?.toLowerCase() || '';
      const tagName = current.tagName?.toLowerCase() || '';
      const computed = window.getComputedStyle(current);
      const rect = current.getBoundingClientRect();
      
      let score = 0;
      
      conversationIndicators.forEach(indicator => {
        if (className.includes(indicator) || id.includes(indicator)) {
          score += 5;
        }
      });
      
      const messageSelectors = [
        '[class*="message"]', '[class*="chat"]', '[class*="turn"]',
        '[class*="prompt"]', '[class*="response"]', '[class*="user"]',
        '[class*="assistant"]', '[role="article"]', '[data-message-id]',
        '[data-turn-id]'
      ];
      
      let messageCount = 0;
      const currentEl = current;
      messageSelectors.forEach(selector => {
        try {
          messageCount += currentEl.querySelectorAll(selector).length;
        } catch (e) { /* ignore */ }
      });
      
      if (messageCount >= 2) {
        score += Math.min(messageCount * 2, 30);
      }
      
      if (computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
        score += 10;
        if (current.scrollHeight > current.clientHeight * 1.5) {
          score += 15;
        }
      }
      
      const descendantCount = current.querySelectorAll('*').length;
      if (descendantCount > 20) {
        score += Math.min(descendantCount / 20, 10);
      }
      
      const viewportHeight = window.innerHeight;
      const scrollHeight = current.scrollHeight || rect.height;
      
      if (scrollHeight > viewportHeight * 0.5) score += 8;
      if (scrollHeight > viewportHeight * 2) score += 10;
      
      if (['article', 'section', 'main'].includes(tagName)) score += 3;
      if (rect.height < 100 && scrollHeight < 200) score -= 5;
      
      if (current.parentElement) {
        const parentTag = current.parentElement.tagName?.toLowerCase();
        if (parentTag === 'body' || parentTag === 'main') score += 5;
      }
      
      const dataAttrs = Array.from(current.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => attr.name.toLowerCase());
      if (dataAttrs.some(attr => attr.includes('conversation') || attr.includes('chat') || attr.includes('thread'))) {
        score += 8;
      }
      
      if (score > bestScore && (score >= 10 || (messageCount >= 2 && score >= 5))) {
          bestScore = score;
          bestMatch = current;
      }
      
      current = current.parentElement;
    }
    
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

  // Scroll through and collect ALL conversation content
  const collectFullConversation = useCallback(async (
    container: HTMLElement,
    onProgress?: (msg: string) => void
  ): Promise<string> => {
    onProgress?.('Preparing to collect conversation...');
    
    let scrollableEl: HTMLElement | null = container;
    
    const isScrollable = (el: HTMLElement): boolean => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && 
             el.scrollHeight > el.clientHeight;
    };
    
    if (!isScrollable(container)) {
      let parent = container.parentElement;
      while (parent && parent !== document.body) {
        if (isScrollable(parent)) {
          scrollableEl = parent;
          break;
        }
        parent = parent.parentElement;
      }
      if (!scrollableEl || !isScrollable(scrollableEl)) {
        if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
          scrollableEl = document.documentElement;
        }
      }
    }
    
    if (!scrollableEl) return container.outerHTML;
    
    const originalScrollTop = scrollableEl.scrollTop;
    const scrollHeight = scrollableEl.scrollHeight;
    const clientHeight = scrollableEl.clientHeight;
    
    if (scrollHeight <= clientHeight * 1.2) return container.outerHTML;
    
    onProgress?.('Scrolling to start of conversation...');
    
    scrollableEl.scrollTop = 0;
    await new Promise(r => setTimeout(r, 500));
    
    const collectedMessages: Map<string, { html: string; order: number }> = new Map();
    let messageOrder = 0;
    
    const messageSelectors = [
      '[data-message-id]', '[data-testid*="conversation-turn"]',
      '[class*="ConversationItem"]', '[class*="message-"]',
      '[class*="chat-message"]', '[class*="Message_"]',
      '[role="article"]', 'article[data-scroll-anchor]',
      '[class*="group/conversation-turn"]', '[class*="prose"]',
      '[data-message-author-role]', '.message', '.chat-turn',
    ];
    
    const getMessageKey = (el: HTMLElement): string => {
      const dataId = el.getAttribute('data-message-id') || 
                     el.getAttribute('data-testid') ||
                     el.getAttribute('data-scroll-anchor');
      if (dataId) return dataId;
      const textContent = el.textContent?.slice(0, 200) || '';
      return `${el.tagName}-${textContent.length}-${textContent.slice(0, 50)}`;
    };
    
    const collectVisibleMessages = () => {
      for (const selector of messageSelectors) {
        try {
          const messages = container.querySelectorAll(selector);
          messages.forEach((msg) => {
            const el = msg as HTMLElement;
            const key = getMessageKey(el);
            if (!collectedMessages.has(key)) {
              const clone = el.cloneNode(true) as HTMLElement;
              
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
              collectedMessages.set(key, { html: clone.outerHTML, order: messageOrder++ });
            }
          });
        } catch (e) { /* invalid selector */ }
      }
    };
    
    const collectDirectChildren = () => {
      const children = container.children;
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        const key = `child-${i}-${el.tagName}-${(el.textContent?.slice(0, 50) || '')}`;
        if (!collectedMessages.has(key)) {
          collectedMessages.set(key, { html: el.outerHTML, order: messageOrder++ });
        }
      }
    };
    
    const scrollStep = clientHeight * 0.7;
    let currentScroll = 0;
    let lastMessageCount = 0;
    let stableCount = 0;
    
    while (currentScroll < scrollHeight + clientHeight) {
      onProgress?.(`Collecting messages... (${collectedMessages.size} found)`);
      
      scrollableEl.scrollTop = currentScroll;
      await new Promise(r => setTimeout(r, 300));
      
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
    
    scrollableEl.scrollTop = scrollableEl.scrollHeight;
    await new Promise(r => setTimeout(r, 500));
    collectVisibleMessages();
    if (collectedMessages.size === 0) collectDirectChildren();
    
    onProgress?.(`Collected ${collectedMessages.size} messages. Restoring view...`);
    scrollableEl.scrollTop = originalScrollTop;
    
    if (collectedMessages.size > 0) {
      const sortedMessages = Array.from(collectedMessages.values())
        .sort((a, b) => a.order - b.order)
        .map(m => m.html);
      
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
    
    return container.outerHTML;
  }, []);

  // Listen for messages from popup
  useEffect(() => {
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
        } catch (e) { /* context might be invalidated */ }
      };
    } catch (e) {
      console.error('Failed to attach message listener:', e);
    }
  }, []);

  // Selection event handlers
  useEffect(() => {
    if (!isActive) return;

    const getExtensionRoot = () => document.getElementById('ai-chat-export-root');

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const root = getExtensionRoot();
      if (root === target) return;

      let elementToHighlight = target;
      
      if (selectionModeRef.current === 'conversation') {
        const container = findConversationContainer(target);
        if (container) elementToHighlight = container;
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
        
        if (selectionModeRef.current === 'conversation') {
          const container = findConversationContainer(hoveredElRef.current);
          if (container) {
            el = container;
            setIsExporting(true);
            setExportProgress('Collecting conversation...');
            
            try {
              content = await collectFullConversation(container, (msg) => {
                setExportProgress(msg);
              });
            } catch (err) {
              console.error('Error collecting conversation:', err);
              content = el.outerHTML;
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
        
        const isAlreadySelected = selectedElements.some(
          selected => selected.originalId === el.id
        );
        
        if (!isAlreadySelected && content) {
          const computed = window.getComputedStyle(el);
          const computedStyles: { [key: string]: string } = {};
          
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
  }, [isActive, selectedElements, collectFullConversation]);

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
      <SelectionOverlay isVisible={isActive} rect={hoverRect} />
      
      <SelectionPanel
        isActive={isActive}
        selectionMode={selectionMode}
        selectedElements={selectedElements}
        isExporting={isExporting}
        exportProgress={exportProgress}
        showExportMenu={showExportMenu}
        onClose={() => {
              setIsActive(false);
              setSelectedElements([]);
            }}
        onModeChange={setSelectionMode}
        onRemoveElement={(id) => setSelectedElements(prev => prev.filter(el => el.id !== id))}
        onClearAll={() => setSelectedElements([])}
        onDoneSelecting={() => setIsActive(false)}
        onResumeSelecting={() => setIsActive(true)}
        onToggleExportMenu={() => setShowExportMenu(!showExportMenu)}
        onExport={handleExport}
      />
    </div>
  );
};
