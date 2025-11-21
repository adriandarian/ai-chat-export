import { useState } from 'react';
import { MousePointer2, ArrowRight, MessageSquare, FileText, Code, FileJson, Sparkles, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

function App() {
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleStartSelection = async () => {
    setError(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      setError("Could not identify tab.");
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
      setError("Cannot run on system pages.");
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECTION_MODE', payload: true });
      window.close();
    } catch (err: any) {
      console.error('Connection error, attempting injection:', err);
      
      // Try to inject script dynamically if communication fails
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['assets/index.tsx-loader-2wRqBKLD.js'] // This needs to match the build output, but let's use the safer way below
        });
        // Actually, let's just ask user to refresh for now as dynamic injection of complex vite builds is tricky without the exact filename from manifest.
        // However, we can try a cleaner approach:
        setError("Please refresh the page to enable the extension.");
      } catch (injectionErr) {
         console.error('Injection failed:', injectionErr);
         setError("Please refresh the page.");
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
      <div className="flex-1 p-5 flex flex-col relative overflow-hidden">
        
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none opacity-60"></div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-xs font-medium text-center mb-6 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        ) : (
          <div className="space-y-5 relative z-0">
            
            {/* Hero Text */}
            <div className="text-center space-y-1.5 mt-1">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">Export your chats</h2>
              <p className="text-xs text-text-muted leading-relaxed max-w-[240px] mx-auto">
                Select specific messages or entire threads from ChatGPT, Claude, and more.
              </p>
            </div>

            {/* Formats */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-surface/50 hover:bg-surface-highlight hover:border-primary/30 hover:shadow-md transition-all duration-200 group cursor-default">
                <FileText size={18} className="text-text-muted group-hover:text-red-500 transition-colors mb-1.5" />
                <span className="text-[10px] font-semibold text-text-secondary group-hover:text-text-primary">PDF</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-surface/50 hover:bg-surface-highlight hover:border-primary/30 hover:shadow-md transition-all duration-200 group cursor-default">
                <Code size={18} className="text-text-muted group-hover:text-blue-500 transition-colors mb-1.5" />
                <span className="text-[10px] font-semibold text-text-secondary group-hover:text-text-primary">HTML</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-surface/50 hover:bg-surface-highlight hover:border-primary/30 hover:shadow-md transition-all duration-200 group cursor-default">
                <FileJson size={18} className="text-text-muted group-hover:text-amber-500 transition-colors mb-1.5" />
                <span className="text-[10px] font-semibold text-text-secondary group-hover:text-text-primary">JSON</span>
              </div>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-auto pt-4 relative z-10">
          <button 
            onClick={handleStartSelection}
            className="w-full bg-primary hover:bg-primary-hover text-primary-text py-3 rounded-xl font-semibold text-sm shadow-xl shadow-primary/10 hover:shadow-2xl hover:shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group"
          >
            <MousePointer2 size={16} className="opacity-80 group-hover:opacity-100 transition-colors" />
            Start Selection Mode
            <ArrowRight size={15} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-text-muted font-medium uppercase tracking-wider opacity-60">
            <Sparkles size={10} />
            <span>Preserves Styles & Formatting</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
