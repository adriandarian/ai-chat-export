import { useEffect, useState, useRef } from 'react';
import { Message, SelectedElement } from '../types';
import { Trash2, FileDown, X, MousePointer2, Check } from 'lucide-react';

import { generateExportHTML, downloadBlob } from '../utils/export';

export const ContentApp = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [hoverRect, setHoverRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  
  // We keep track of the actual element to ensure we don't re-select or select the wrong thing
  const hoveredElRef = useRef<HTMLElement | null>(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
      setHoverRect(null);
      hoveredElRef.current = null;
    }
  }, [isActive]);

  // Message Listener
  useEffect(() => {
    const handleMessage = (msg: Message) => {
      if (msg.type === 'TOGGLE_SELECTION_MODE') {
        const newState = msg.payload !== undefined ? msg.payload : !isActiveRef.current;
        setIsActive(newState);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Interaction Logic
  useEffect(() => {
    if (!isActive) return;

    const getExtensionRoot = () => document.getElementById('ai-chat-export-root');

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const root = getExtensionRoot();
      
      // Ignore our own UI (Shadow Host)
      if (root === target) return;

      hoveredElRef.current = target;
      const rect = target.getBoundingClientRect();
      setHoverRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    const handleClick = (e: MouseEvent) => {
      const root = getExtensionRoot();
      
      // Check if the click target is part of our extension UI
      // Using composedPath allows us to see the full path even through shadow roots
      const path = e.composedPath();
      if (path.includes(root as EventTarget)) {
        return; // Do not process clicks on our own UI
      }

      if (isActiveRef.current && hoveredElRef.current) {
        e.preventDefault();
        e.stopPropagation();
        
        const el = hoveredElRef.current;
        const newElement: SelectedElement = {
          id: crypto.randomUUID(),
          originalId: el.id,
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          xpath: '', // TODO: Implement if needed
          content: el.outerHTML
        };

        setSelectedElements(prev => [...prev, newElement]);
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

  // Keep UI visible if we have items, OR if active
  if (!isActive && selectedElements.length === 0) return null;

  return (
    <div className="font-sans text-gray-800 pointer-events-none">
      {/* Highlighter Box */}
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

      {/* Control Panel */}
      <div className="fixed bottom-4 right-4 z-[10001] bg-white shadow-2xl rounded-lg border border-gray-200 w-80 overflow-hidden flex flex-col max-h-[500px] pointer-events-auto font-sans">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
            <h3 className="font-semibold text-sm">
              {isActive ? 'Selecting Elements...' : 'Ready to Export'}
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
        
        <div className="p-3 flex-1 overflow-y-auto min-h-[100px] max-h-[300px]">
          {selectedElements.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">
              <MousePointer2 className="mx-auto mb-2 opacity-50" size={24} />
              <p>Hover and click elements to select them.</p>
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

        <div className="p-3 border-t border-gray-200 bg-gray-50 flex flex-col gap-2">
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
            <div className="flex gap-2">
               <button 
                 className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                 onClick={() => setIsActive(true)}
               >
                 Resume
               </button>
               <button 
                 className="flex-1 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 disabled={selectedElements.length === 0}
                 onClick={() => {
                    const html = generateExportHTML(selectedElements);
                    downloadBlob(html, `chat-export-${Date.now()}.html`, 'text/html');
                 }}
               >
                 <FileDown size={16} />
                 Export HTML
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
