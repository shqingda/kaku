import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Only an app-scoped digest leaves the device. This is a grouping hint, never a login credential.
export async function getLoginDevice() {
  const platform = Platform.OS;
  const deviceName = (Device.modelName || (platform === 'android' ? 'Android 设备' : platform === 'ios' ? 'iOS 设备' : 'Kaku 设备')).slice(0, 80);
  try {
    const id = platform === 'android' ? Application.getAndroidId()
      : platform === 'ios' ? await Application.getIosIdForVendorAsync() : null;
    if (!id) return { deviceName };
    const deviceKey = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,
      `kaku-device-v1:${Application.applicationId}:${platform}:${id}`);
    return { deviceName, deviceKey };
  } catch {
    // Unsupported devices can still sign in; absent identifiers must never be merged.
    return { deviceName };
  }
}
