import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MIN_TOUCH_SIZE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';

import { PICKER_EMOJI } from './emoji-catalog';

// 紧凑的 Bangumi 表情选择器：一行横向滚动，点击即把 (bgmNN) / ASCII 颜文字
// 插入输入框光标处。选择器本身不抢焦点，方便连续选择多个表情。
export function BangumiEmojiPicker({
  onSelect,
}: {
  onSelect: (sticker: string) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={PICKER_EMOJI}
        horizontal
        initialNumToRender={24}
        keyboardShouldPersistTaps="always"
        keyExtractor={(item) => item.sticker}
        renderItem={({ item: emoji }) => (
          <Pressable
            accessibilityLabel={`插入表情 ${emoji.sticker}`}
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => {
              playSelectionHaptic();
              onSelect(emoji.sticker);
            }}
            style={({ pressed }) => [
              styles.cell,
              pressed && styles.pressed,
            ]}
          >
            <Image
              contentFit="contain"
              recyclingKey={emoji.sticker}
              source={emoji.url}
              style={styles.image}
              transition={80}
            />
          </Pressable>
        )}
        showsHorizontalScrollIndicator={false}
        style={styles.list}
        windowSize={5}
      />
    </View>
  );
}

// 输入框工具条上的“表情”按钮，展开/收起上面的表情面板。
export function BangumiEmojiToolbar({
  onInsert,
}: {
  onInsert: (sticker: string) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityLabel={expanded ? '收起表情选择器' : '插入 Bangumi 表情'}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={8}
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [
            styles.toggleButton,
            expanded && styles.toggleButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              android: expanded ? 'keyboard_arrow_down' : 'mood',
              ios: expanded ? 'chevron.down' : 'face.smiling',
              web: expanded ? 'keyboard_arrow_down' : 'mood',
            }}
            size={18}
            tintColor={expanded ? colors.accent : colors.muted}
            weight="semibold"
          />
          <Text style={[styles.toggleText, expanded && styles.toggleTextActive]}>
            表情
          </Text>
        </Pressable>
        <Text style={styles.hint}>插入后会以 Bangumi 官方表情显示</Text>
      </View>
      {expanded ? <BangumiEmojiPicker onSelect={onInsert} /> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginBottom: 4,
      marginTop: 2,
      paddingVertical: 6,
    },
    content: {
      gap: 4,
      paddingHorizontal: 2,
    },
    list: {
      flexGrow: 0,
      height: 44,
    },
    cell: {
      alignItems: 'center',
      borderRadius: 10,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    image: {
      height: 28,
      width: 28,
    },
    pressed: {
      backgroundColor: colors.surfaceSoft,
      opacity: 0.7,
    },
    toolbar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 36,
    },
    toggleButton: {
      alignItems: 'center',
      borderRadius: 10,
      flexDirection: 'row',
      gap: 6,
      minHeight: MIN_TOUCH_SIZE,
      paddingHorizontal: 10,
    },
    toggleButtonActive: {
      backgroundColor: colors.accentSoft,
    },
    toggleText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '600',
    },
    toggleTextActive: {
      color: colors.accent,
    },
    hint: {
      color: colors.subtle,
      fontSize: 11,
    },
  });
