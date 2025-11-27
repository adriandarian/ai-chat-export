import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'midnight';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Load saved theme (default to light)
    try {
      if (!chrome?.runtime?.id) {
        // Extension context invalidated, use default light theme
        return;
      }
      chrome.storage.local.get(['theme'], (result) => {
        if (result.theme) {
          setThemeState(result.theme as Theme);
        }
        // Default to light theme if no preference saved
      });
    } catch (e) {
      // Extension context invalidated or storage unavailable, use default light theme
      console.warn('Could not access storage:', e);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      if (!chrome?.runtime?.id) {
        // Extension context invalidated, skip saving
        return;
      }
      chrome.storage.local.set({ theme: newTheme });
    } catch (e) {
      // Extension context invalidated or storage unavailable, skip saving
      console.warn('Could not save theme:', e);
    }
  };

  useEffect(() => {
    // Apply theme class to html or body
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

