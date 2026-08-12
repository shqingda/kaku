import { router } from 'expo-router';

import { HeaderIconButton } from '@/features/shared/header-icon-button';

export function HeaderHomeButton() {
  return (
    <HeaderIconButton
      accessibilityHint="返回 Kaku 首页"
      accessibilityLabel="回到首页"
      icon={{ android: 'home', ios: 'house', web: 'home' }}
      iconOffset={{ y: 0.5 }}
      iconSize={18}
      iconWeight="regular"
      onPress={() => router.dismissTo('/')}
    />
  );
}
