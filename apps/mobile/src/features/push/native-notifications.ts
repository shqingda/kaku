import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');

export function hasNotificationsNativeModule() {
  if (Platform.OS === 'web') return false;
  return requireOptionalNativeModule('ExpoPushTokenManager') != null;
}

export function loadNotifications(): NotificationsModule | null {
  if (!hasNotificationsNativeModule()) return null;
  return require('expo-notifications') as NotificationsModule;
}

export function isPhysicalDevice(): boolean | null {
  if (Platform.OS === 'web') return false;
  if (requireOptionalNativeModule('ExpoDevice') == null) return null;
  const Device = require('expo-device') as DeviceModule;
  return Device.isDevice;
}
