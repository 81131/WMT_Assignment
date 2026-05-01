import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/theme';
import * as SecureStore from '../utils/storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('dark'); // 'light', 'dark', or 'system'
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      const savedTheme = await SecureStore.getItemAsync('themePreference');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemTheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemTheme]);

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    await SecureStore.setItemAsync('themePreference', newMode);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
