import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  error: string;
}

export const lightTheme: ThemeColors = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#1a1a1a',
  textSecondary: '#666666',
  primary: '#e50914',
  border: '#e0e0e0',
  error: '#ff6b6b',
};

export const darkTheme: ThemeColors = {
  background: '#1a1a1a',
  surface: '#2a1a2a',
  text: '#ffffff',
  textSecondary: '#999999',
  primary: '#e50914',
  border: '#333333',
  error: '#ff6b6b',
};

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [colors, setColors] = useState<ThemeColors>(
    colorScheme === 'dark' ? darkTheme : lightTheme
  );

  useEffect(() => {
    setColors(colorScheme === 'dark' ? darkTheme : lightTheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={{ colors, isDark: colorScheme === 'dark' }}>
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