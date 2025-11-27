import { useEffect, useState, useRef } from 'react';
import { Message, SelectedElement, Theme, SelectionMode, ExportFormat } from '../types';
import { SelectionOverlay, SelectionPanel } from '../components';
import { 
  generateExportHTML, 
  downloadBlob, 
  downloadPDF, 
  generateExportMarkdown, 
  generateExportJSON,
  findConversationContainer,
  collectFullConversation,
} from '../utils/export';

export const ContentApp = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('element');
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [hoverRect, setHoverRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [theme, setTheme] = useState<Theme>('light');
  
  const hoveredElRef = useRef<HTMLElement | null>(null);
  const isActiveRef = useRef(isActive);
  const selectionModeRef = useRef<SelectionMode>(selectionMode);

  // Load theme from storage and listen for changes
  useEffect(() => {
    const loadTheme = () => {
      try {
        if (!chrome?.runtime?.id) return;
        chrome.storage.local.get(['theme'], (result) => {
          if (result.theme) {
            setTheme(result.theme as Theme);
          }
        });
      } catch (e) {
        console.warn('Could not load theme:', e);
      }
    };

    loadTheme();

    // Listen for theme changes from popup
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.theme?.newValue) {
        setTheme(changes.theme.newValue as Theme);
      }
    };

    try {
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => {
          chrome.storage.onChanged.removeListener(handleStorageChange);
        };
      }
    } catch (e) {
      console.warn('Could not attach storage listener:', e);
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = isActive;
    selectionModeRef.current = selectionMode;
    if (!isActive) {
      setHoverRect(null);
      hoveredElRef.current = null;
    }
  }, [isActive, selectionMode]);

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
  }, [isActive, selectedElements]);

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
        const json = generateExportJSON(selectedElements);
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
    <div className="font-sans pointer-events-none" data-theme={theme}>
      <SelectionOverlay isVisible={isActive} rect={hoverRect} />
      
      <SelectionPanel
        isActive={isActive}
        selectionMode={selectionMode}
        selectedElements={selectedElements}
        isExporting={isExporting}
        exportProgress={exportProgress}
        showExportMenu={showExportMenu}
        theme={theme}
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
