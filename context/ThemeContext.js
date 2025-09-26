import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Light theme colors - Improved contrast and visibility
const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#8B5CF6',      // Purple primary accent
    primaryDark: '#7C3AED',  // Darker purple
    background: '#FAFAFA',   // Pure light gray background
    surface: '#FFFFFF',      // Pure white surfaces
    card: '#EEEEEE',         // Darker gray cards for better contrast
    text: '#1F1F1F',         // Lighter black text (less harsh)
    textSecondary: '#525252', // Pure medium gray text
    textTertiary: '#737373',  // Pure light gray text
    border: '#D4D4D4',       // Pure gray borders
    borderLight: '#E5E5E5',   // Very light gray borders
    success: '#059669',      // Green for "you're owed"
    error: '#DC2626',        // Red for "you owe"
    warning: '#D97706',      // Amber warning
    info: '#8B5CF6',         // Purple info (instead of blue)
    accent: '#8B5CF6',       // Purple accent
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  statusBar: 'dark',
};

// Dark theme colors - Softer contrast with lighter blacks
const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#A855F7',      // Bright purple for primary accents
    primaryDark: '#9333EA',   // Deeper purple
    background: '#1A1A1A',    // Lighter black background (less harsh)
    surface: '#2A2A2A',      // Lighter dark gray surface
    card: '#363636',         // Lighter gray cards
    text: '#E5E5E5',         // Softer light gray text (not pure white)
    textSecondary: '#C0C0C0', // Softer medium light gray
    textTertiary: '#999999',  // Softer medium gray
    border: '#4A4A4A',        // Lighter dark gray borders
    borderLight: '#606060',   // Lighter medium gray borders
    success: '#10B981',       // Green for "you're owed"
    error: '#EF4444',         // Red for "you owe"  
    warning: '#F59E0B',       // Amber for warnings
    info: '#A855F7',          // Purple for info (instead of blue)
    accent: '#A855F7',        // Purple accent
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.8)',
    positive: '#10B981',      // Green for positive amounts
    negative: '#EF4444',      // Red for negative amounts
    neutral: '#999999',       // Softer neutral gray
  },
  statusBar: 'light',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
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
      } else {
        // If no saved preference, default to dark mode
        setIsDarkMode(true);
        await AsyncStorage.setItem('theme', 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
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