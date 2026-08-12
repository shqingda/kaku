import { router } from 'expo-router';
import { Platform } from 'react-native';

import { HeaderIconButton } from '@/features/shared/header-icon-button';

// The 0.5pt downward nudge optically centers iOS's SF "house" glyph, which
// sits high in its box; Material's home_filled is already centered.
const ICON_OFFSET = Platform.OS === 'ios' ? { y: 0.5 } : undefined;

export function HeaderHomeButton() {
  return (
    <HeaderIconButton
      accessibilityHint="返回 Kaku 首页"
      accessibilityLabel="回到首页"
      icon={{ android: 'home_filled', ios: 'house', web: 'home' }}
      iconOffset={ICON_OFFSET}
      onPress={() => router.dismissTo('/')}
    />
  );
}
