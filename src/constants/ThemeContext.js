import React, { createContext, useState, useContext } from 'react';
import { Colors } from './theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState('light'); // Default to light

  const toggleTheme = () => {
    setActiveTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = Colors[activeTheme];

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
