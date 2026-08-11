import type { ReactNode } from 'react';
import { RefreshControl } from 'react-native';

import { COLORS } from '@/constants/design';

export function AppRefreshControl({
  children,
  onRefresh,
  refreshing,
}: {
  children?: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <RefreshControl
      colors={[COLORS.accent]}
      onRefresh={onRefresh}
      progressBackgroundColor={COLORS.surface}
      refreshing={refreshing}
      tintColor={COLORS.accent}
    >
      {children}
    </RefreshControl>
  );
}
