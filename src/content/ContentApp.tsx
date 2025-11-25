import { useEffect, useState, useRef } from 'react';
import { Message, SelectedElement } from '../types';
import { Trash2, FileDown, X, MousePointer2, Check, ChevronDown, FileText, Code, FileJson, MessageSquare } from 'lucide-react';

import { generateExportHTML, downloadBlob, downloadPDF } from '../utils/export';

type ExportFormat = 'html' | 'pdf' | 'json';
type SelectionMode = 'element' | 'conversation';

export const ContentApp = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('element');
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [hoverRect, setHoverRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
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
      messageSelectors.forEach(selector => {
        try {
          messageCount += current.querySelectorAll(selector).length;
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
      const heightRatio = scrollHeight / viewportHeight;
      
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

    const handleClick = (e: MouseEvent) => {
      const root = getExtensionRoot();
      const path = e.composedPath();
      if (path.includes(root as EventTarget)) return;

      if (isActiveRef.current && hoveredElRef.current) {
        e.preventDefault();
        e.stopPropagation();
        
        let el = hoveredElRef.current;
        
        // In conversation mode, use the conversation container if found
        if (selectionModeRef.current === 'conversation') {
          const container = findConversationContainer(hoveredElRef.current);
          if (container) {
            el = container;
          }
        }
        
        // Check if this element is already selected (avoid duplicates)
        const isAlreadySelected = selectedElements.some(
          selected => selected.originalId === el.id && selected.content === el.outerHTML
        );
        
        if (!isAlreadySelected) {
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
          className: el.className,
          xpath: '',
            content: el.outerHTML,
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
      window.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
    };
  }, [isActive]);

  const removeElement = (id: string) => {
    setSelectedElements(prev => prev.filter(el => el.id !== id));
  };

  const handleExport = async (format: ExportFormat) => {
    if (format === 'html') {
      const html = generateExportHTML(selectedElements);
      downloadBlob(html, `chat-export-${Date.now()}.html`, 'text/html');
    } else if (format === 'json') {
      const json = JSON.stringify(selectedElements, null, 2);
      downloadBlob(json, `chat-export-${Date.now()}.json`, 'application/json');
    } else if (format === 'pdf') {
      await downloadPDF(selectedElements, `chat-export-${Date.now()}.pdf`);
    }
    setShowExportMenu(false);
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
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500 font-medium">{selectedElements.length} items selected</span>
            <button 
               className="text-xs text-red-500 hover:text-red-700 font-medium"
               onClick={() => setSelectedElements([])}
               disabled={selectedElements.length === 0}
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
