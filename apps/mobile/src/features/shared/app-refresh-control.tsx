import { RefreshControl } from 'react-native';

import { COLORS } from '@/constants/design';

export function AppRefreshControl({
  onRefresh,
  refreshing,
}: {
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
    />
  );
}
