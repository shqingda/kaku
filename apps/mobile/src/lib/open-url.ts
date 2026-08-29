import { Alert, Linking } from 'react-native';

// 打开外部链接；失败时给出明确提示，而不是静默无反应。
export async function openExternalUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('暂时无法打开', '请检查网络后重试。');
  }
}
