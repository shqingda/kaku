import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from '@/constants/theme';

const ThemeContext = createContext<ThemeColors>(LIGHT_COLORS);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
