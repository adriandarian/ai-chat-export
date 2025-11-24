import { useState } from 'react';
import { MousePointer2, ArrowRight, MessageSquare, Sparkles, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

function App() {
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleStartSelection = async () => {
    setError(null);
    
    // Check if extension context is valid
    try {
      if (!chrome?.runtime?.id) {
        setError("Extension context invalidated. Please reload the extension.");
        return;
      }
    } catch (e) {
      setError("Extension context invalidated. Please reload the extension.");
      return;
    }

    let tab;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (err: any) {
      console.error('Failed to query tabs:', err);
      setError("Failed to access tabs. Extension may need to be reloaded.");
      return;
    }
    
    if (!tab?.id) {
      setError("Could not identify tab.");
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
      setError("Cannot run on system pages.");
      return;
    }

    // First, try to inject the content script if it's not already loaded
    try {
      // Get content script files from manifest
      const manifest = chrome.runtime.getManifest();
      const contentScripts = manifest.content_scripts?.[0]?.js || [];
      
      if (contentScripts.length > 0) {
        // Inject all content script files
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: contentScripts,
        });
        
        // Wait a bit for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (injectionErr: any) {
      console.error('Content script injection failed:', injectionErr);
      // Check if it's a context invalidation error
      if (injectionErr?.message?.includes('Extension context invalidated') || 
          injectionErr?.message?.includes('context invalidated')) {
        setError("Extension was reloaded. Please refresh this page and try again.");
        return;
      }
      // Continue anyway - might already be injected
    }

    // Now try to send the message
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECTION_MODE', payload: true });
      window.close();
    } catch (err: any) {
      console.error('Message send failed:', err);
      const errorMessage = err?.message || '';
      if (errorMessage.includes('Extension context invalidated') || 
          errorMessage.includes('context invalidated') ||
          errorMessage.includes('Receiving end does not exist')) {
        setError("Extension context invalidated. Please refresh the page and try again.");
      } else {
        setError("Failed to connect to page. Please refresh the page and try again.");
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-text-primary font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg text-primary-text">
            <MessageSquare size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-text-primary">Chat Export</h1>
            <p className="text-[10px] font-medium text-text-muted mt-0.5 tracking-wide">AI CONVERSATION SAVER</p>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-1.5 rounded-full transition-colors text-text-muted hover:text-text-primary hover:bg-surface-highlight active:scale-95"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col relative overflow-hidden justify-center">
        
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none opacity-60"></div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-xs font-medium text-center mb-6 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        ) : (
          <div className="space-y-6 relative z-0 text-center">
            
            {/* Hero Text */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Export your chats</h2>
              <p className="text-sm text-text-muted leading-relaxed max-w-[260px] mx-auto">
                Select messages from ChatGPT, Claude, and more to export as <span className="text-primary font-semibold">PDF</span>, <span className="text-primary font-semibold">HTML</span>, or <span className="text-primary font-semibold">JSON</span>.
              </p>
            </div>

            {/* Simple Action Button */}
            <div className="pt-2">
              <button 
                onClick={handleStartSelection}
                className="w-full bg-primary hover:bg-primary-hover text-primary-text py-3.5 rounded-xl font-semibold text-sm shadow-xl shadow-primary/10 hover:shadow-2xl hover:shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group"
              >
                <MousePointer2 size={18} className="opacity-80 group-hover:opacity-100 transition-colors" />
                Start Selection Mode
                <ArrowRight size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted font-medium uppercase tracking-wider opacity-60">
              <Sparkles size={10} />
              <span>Preserves Styles & Formatting</span>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App
