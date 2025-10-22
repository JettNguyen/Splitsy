import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

// theme context for light/dark modes
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// light theme colors
const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    background: '#f1f5f9',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#334155',
    textTertiary: '#475569',
    border: '#cbd5e1',
    borderLight: '#e2e8f0',
    success: '#059669',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  statusBar: 'dark',
};

// dark theme colors
const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#a855f7',
    primaryDark: '#8b5cf6',
    background: '#0f172a',
    surface: '#1e293b',
    card: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    border: '#475569',
    borderLight: '#64748b',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    accent: '#7c3aed',
    accentLight: '#ddd6fe',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.8)',
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#94a3b8',
  },
  statusBar: 'light',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // default to dark mode
  const [isLoading, setIsLoading] = useState(true);

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      } 
      else {
        // if no saved preference, default to dark mode
        setIsDarkMode(true);
        await AsyncStorage.setItem('theme', 'dark');
      }
    } 
    catch (error) {
      console.error('Error loading theme preference:', error);
    } 
    finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } 
    catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={theme.statusBar} backgroundColor={theme.colors.background} />
      {children}
    </ThemeContext.Provider>
  );
};

export { lightTheme, darkTheme };
export default ThemeContext;