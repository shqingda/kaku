import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting } from 'expo-quick-actions/router';

import { HOME_SHORTCUTS } from './home-shortcuts';

const ANDROID_ICON = 'shortcut';

export function useHomeScreenShortcuts() {
  useQuickActionRouting();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void QuickActions.setItems(
      HOME_SHORTCUTS.map((item) => ({
        icon: Platform.OS === 'android' ? ANDROID_ICON : item.iosIcon,
        id: item.id,
        params: { href: item.href },
        subtitle: item.subtitle,
        title: item.title,
      })),
    );
  }, []);
}
