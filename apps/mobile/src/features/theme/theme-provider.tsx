import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from '@/constants/theme';
import { usePreferences } from '@/features/preferences/preferences-provider';
import {
  resolveTheme,
  type ResolvedTheme,
} from '@/features/preferences/preferences-model';

const ThemeContext = createContext<ThemeColors>(LIGHT_COLORS);
const ThemeSchemeContext = createContext<ResolvedTheme>('light');

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { preferences } = usePreferences();
  const scheme = resolveTheme(preferences.theme, systemScheme);
  const colors = scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeSchemeContext.Provider value={scheme}>
      <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>
    </ThemeSchemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeScheme() {
  return useContext(ThemeSchemeContext);
}
