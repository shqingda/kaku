import { Alert } from 'react-native';

export function confirmDiscard(onDiscard: () => void) {
  Alert.alert(
    '放弃未保存的内容？',
    '关闭后，本次编辑的内容不会保存。',
    [
      { style: 'cancel', text: '继续编辑' },
      { onPress: onDiscard, style: 'destructive', text: '放弃' },
    ],
  );
}
