import { useEffect } from 'react';
import { router, type Href } from 'expo-router';
import { Platform } from 'react-native';

import { loadNotifications } from './native-notifications';

function hrefFromNotification(data: unknown): Href | null {
  if (!data || typeof data !== 'object' || !('href' in data)) {
    return '/notifications';
  }
  const href = (data as { href?: unknown }).href;
  return typeof href === 'string' ? (href as Href) : '/notifications';
}

export function useNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const Notifications = loadNotifications();
    if (!Notifications) return;

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      return;
    }

    function open(data: unknown) {
      const href = hrefFromNotification(data);
      if (href) router.push(href);
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        open(response.notification.request.content.data);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        open(response.notification.request.content.data);
      },
    );

    return () => subscription.remove();
  }, []);
}
