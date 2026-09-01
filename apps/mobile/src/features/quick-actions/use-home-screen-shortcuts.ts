import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';

import { HOME_SHORTCUTS } from './home-shortcuts';

// 每个 shortcut 的 Android 图标在 home-shortcuts.ts 里指定，
// 名称对应 app.config.js 中 expo-quick-actions androidIcons 的 key。

export function useHomeScreenShortcuts() {
  useQuickActionRouting();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void QuickActions.setItems(
      HOME_SHORTCUTS.map((item) => ({
        icon: Platform.OS === 'android' ? item.androidIcon : item.iosIcon,
        id: item.id,
        params: { href: item.href },
        subtitle: item.subtitle,
        title: item.title,
      })),
    );
  }, []);
}
