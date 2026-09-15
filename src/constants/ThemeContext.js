import React, { createContext, useState, useEffect, useContext } from 'react';
import { Colors } from './theme';
import { translations, getSavedLanguage, saveLanguageSetting } from './translations';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState('light'); // Default to light
  const [currentLanguage, setCurrentLanguageState] = useState('en');

  useEffect(() => {
    getSavedLanguage().then((lang) => {
      if (lang) setCurrentLanguageState(lang);
    });
  }, []);

  const setLanguage = async (newLang) => {
    setCurrentLanguageState(newLang);
    await saveLanguageSetting(newLang);
  };

  const toggleTheme = () => {
    setActiveTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = Colors[activeTheme];
  const t = translations[currentLanguage] || translations.en;

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        setActiveTheme,
        theme,
        toggleTheme,
        currentLanguage,
        setLanguage,
        t,
      }}
    >
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

export function useLanguage() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useLanguage must be used within a ThemeProvider');
  }
  return {
    currentLanguage: context.currentLanguage,
    setLanguage: context.setLanguage,
    t: context.t,
  };
}
