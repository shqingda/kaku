import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');

export function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

export function isPhysicalDevice(): boolean | null {
  if (Platform.OS === 'web') return false;
  try {
    const Device = require('expo-device') as DeviceModule;
    return Device.isDevice;
  } catch {
    return null;
  }
}
