import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * A custom hook to dynamically generate styles based on the current theme.
 * This abstracts styling away from components, acting like a "separate CSS file"
 * that dynamically reacts to Light/Dark mode changes.
 * 
 * @param {Function} styleFactory A function that takes (colors) and returns a StyleSheet
 * @returns {Object} The generated StyleSheet object
 */
export const useThemeStyles = (styleFactory) => {
  const { colors } = useTheme();
  return useMemo(() => styleFactory(colors), [colors, styleFactory]);
};
