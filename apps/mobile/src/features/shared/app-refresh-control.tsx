import { Platform, RefreshControl } from 'react-native';

import { COLORS } from '@/constants/design';

export function AppRefreshControl({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  // RN 0.86 + Fabric can leave Android native-stack screens blank when a
  // custom RefreshControl is mounted during the push transition. Keep the
  // iOS interaction and prefer a visible Android screen over pull-to-refresh.
  if (Platform.OS === 'android') return null;

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
