import { Alert, Share } from 'react-native';

// Bangumi 实体在主站都有固定路径，分享出去的是主站链接。
export async function shareBangumiEntity(options: {
  path: string;
  title: string;
}) {
  const url = `https://bgm.tv${options.path}`;
  const message = options.title ? `${options.title}\n${url}` : url;

  try {
    await Share.share({ message });
  } catch {
    Alert.alert('暂时无法分享', '请稍后重试。');
  }
}
