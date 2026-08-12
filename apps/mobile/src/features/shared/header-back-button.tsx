import { router } from 'expo-router';

import { HeaderIconButton } from '@/features/shared/header-icon-button';

export function HeaderBackButton() {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.dismissTo('/');
  }

  return (
    <HeaderIconButton
      accessibilityHint="返回上一个页面"
      accessibilityLabel="返回"
      icon={{
        android: 'arrow_back',
        ios: 'chevron.left',
        web: 'arrow_back',
      }}
      onPress={goBack}
    />
  );
}
