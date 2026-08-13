import type { ReactNode } from 'react';
import { RefreshControl } from 'react-native';

import { useTheme } from '@/features/theme/theme-provider';

export function AppRefreshControl({
  children,
  onRefresh,
  refreshing,
}: {
  children?: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const colors = useTheme();

  return (
    <RefreshControl
      colors={[colors.accent]}
      onRefresh={onRefresh}
      progressBackgroundColor={colors.surface}
      refreshing={refreshing}
      tintColor={colors.accent}
    >
      {children}
    </RefreshControl>
  );
}
