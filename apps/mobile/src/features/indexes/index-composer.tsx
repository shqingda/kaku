import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { AppSheet } from '@/features/shared/app-sheet';
import { playSuccessHaptic } from '@/lib/haptics';

import { useCreateIndex } from './use-create-index';

const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

// 新建目录：标题 + 说明 + 可见范围，与话题/回复框共用 AppSheet。
export function IndexComposer({
  onClose,
  onCreated,
  visible,
}: {
  onClose: () => void;
  onCreated: (indexId: number) => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const createIndex = useCreateIndex();
  const canPublish = title.trim().length > 0 && !createIndex.isPending;

  useEffect(() => {
    if (!visible) {
      createIndex.reset();
      setTitle('');
      setDesc('');
      setIsPrivate(false);
    }
  }, [visible]);

  function submit() {
    const nextTitle = title.trim();

    if (!nextTitle || createIndex.isPending) {
      return;
    }

    createIndex.mutate(
      { desc: desc.trim(), isPrivate, title: nextTitle },
      {
        onSuccess: (result) => {
          playSuccessHaptic();
          setTitle('');
          setDesc('');
          setIsPrivate(false);
          onCreated(result.id);
        },
      },
    );
  }

  return (
    <AppSheet onClose={onClose} visible={visible}>
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
      >
        <View style={styles.heading}>
          <Pressable
            accessibilityLabel="关闭"
            accessibilityRole="button"
            disabled={createIndex.isPending}
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ android: 'close', ios: 'xmark', web: 'close' }}
              size={17}
              tintColor={COLORS.muted}
              weight="semibold"
            />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            新建目录
          </Text>
          <Pressable
            accessibilityLabel="创建目录"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPublish }}
            disabled={!canPublish}
            hitSlop={5}
            onPress={submit}
            style={({ pressed }) => [
              styles.publishButton,
              !canPublish && styles.publishButtonDisabled,
              pressed && canPublish && styles.pressed,
            ]}
          >
            {createIndex.isPending ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <Text style={styles.publishText}>创建</Text>
            )}
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="目录标题"
          accessibilityHint={`最多输入 ${MAX_TITLE_LENGTH} 个字符`}
          autoFocus
          maxLength={MAX_TITLE_LENGTH}
          onChangeText={setTitle}
          placeholder="给目录起个名字"
          placeholderTextColor={COLORS.subtle}
          returnKeyType="next"
          style={styles.titleInput}
          value={title}
        />
        <TextInput
          accessibilityLabel="目录说明"
          accessibilityHint={`最多输入 ${MAX_DESC_LENGTH} 个字符`}
          maxLength={MAX_DESC_LENGTH}
          multiline
          onChangeText={setDesc}
          placeholder="说明这个目录收录了什么（可选）"
          placeholderTextColor={COLORS.subtle}
          scrollEnabled
          style={styles.bodyInput}
          textAlignVertical="top"
          value={desc}
        />

        <View style={styles.privacyRow}>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>仅自己可见</Text>
            <Text style={styles.privacyDescription}>
              隐藏这个目录，不显示在公开列表
            </Text>
          </View>
          <Switch
            accessibilityLabel="仅自己可见"
            ios_backgroundColor={COLORS.track}
            onValueChange={setIsPrivate}
            trackColor={{ false: COLORS.track, true: COLORS.accentSoft }}
            value={isPrivate}
          />
        </View>

        {createIndex.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {createIndex.error.message}
          </Text>
        ) : null}
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  content: {},
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 14,
  },
  publishButtonDisabled: { opacity: 0.35 },
  publishText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  titleInput: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 18,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  bodyInput: {
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 23,
    minHeight: 120,
    paddingHorizontal: 2,
    paddingTop: 14,
  },
  privacyRow: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  privacyCopy: { flex: 1, gap: 4, paddingRight: 16 },
  privacyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  privacyDescription: {
    color: COLORS.subtle,
    fontSize: 11,
    lineHeight: 16,
  },
  errorText: {
    color: COLORS.accent,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 8,
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
});
