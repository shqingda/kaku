import { Alert } from 'react-native';

export function confirmDiscard(onDiscard: () => void, kind: 'unsaved' | 'draft' = 'unsaved', onCancel?: () => void) {
  Alert.alert(
    kind === 'draft' ? '丢弃本机草稿？' : '放弃未保存的内容？',
    kind === 'draft' ? '这份草稿将从本机删除，无法恢复。' : '关闭后，本次编辑的内容不会保存。',
    [
      { style: 'cancel', text: '继续编辑', onPress: onCancel },
      { onPress: onDiscard, style: 'destructive', text: kind === 'draft' ? '丢弃' : '放弃' },
    ],
    onCancel ? { cancelable: true, onDismiss: onCancel } : undefined,
  );
}
