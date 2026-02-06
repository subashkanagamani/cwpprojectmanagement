import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    let currentTheme: 'light' | 'dark' = 'light';

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      currentTheme = mediaQuery.matches ? 'dark' : 'light';

      const handler = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newTheme);
        root.classList.toggle('dark', newTheme === 'dark');
      };

      mediaQuery.addEventListener('change', handler);
      setEffectiveTheme(currentTheme);
      root.classList.toggle('dark', currentTheme === 'dark');

      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      currentTheme = theme;
      setEffectiveTheme(currentTheme);
      root.classList.toggle('dark', currentTheme === 'dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
