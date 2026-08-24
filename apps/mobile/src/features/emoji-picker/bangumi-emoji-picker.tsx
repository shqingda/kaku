import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { MIN_TOUCH_SIZE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/use-reduce-motion';

import { EMOJI_CATEGORIES } from './emoji-catalog';

const PANEL_HEIGHT = 236;
const GRID_COLUMNS = 6;

// 多列网格 + 分组 Tab 的 Bangumi 表情选择器。参考 Stage1st 第三方客户端的
// 插入表情面板：点击“表情”后从输入框下方自然展开，可切换分类并在网格中浏览。
export function BangumiEmojiPicker({
  onSelect,
}: {
  onSelect: (sticker: string) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [categoryKey, setCategoryKey] = useState(EMOJI_CATEGORIES[0].key);
  const category =
    EMOJI_CATEGORIES.find((item) => item.key === categoryKey) ??
    EMOJI_CATEGORIES[0];

  return (
    <View style={styles.picker}>
      <View style={styles.tabs}>
        {EMOJI_CATEGORIES.map((item) => {
          const selected = item.key === category.key;
          return (
            <Pressable
              accessibilityLabel={`切换到${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={item.key}
              onPress={() => {
                playSelectionHaptic();
                setCategoryKey(item.key);
              }}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selected && styles.tabTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.gridContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        style={styles.grid}
      >
        <View style={styles.gridInner}>
          {category.items.map((emoji) => (
            <Pressable
              accessibilityLabel={`插入表情 ${emoji.sticker}`}
              accessibilityRole="button"
              key={emoji.sticker}
              onPress={() => {
                playSelectionHaptic();
                onSelect(emoji.sticker);
              }}
              style={({ pressed }) => [
                styles.cell,
                pressed && styles.cellPressed,
              ]}
            >
              <Image
                contentFit="contain"
                source={emoji.url}
                style={styles.image}
                transition={80}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// 输入框工具条上的“表情”按钮；展开/收起时使用弹簧动画，保持 Apple 式
// 可中断、从当前值出发的过渡。
export function BangumiEmojiToolbar({
  onInsert,
}: {
  onInsert: (sticker: string) => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(expanded ? 1 : 0, { duration: 160 })
      : withSpring(expanded ? 1 : 0, {
          damping: 22,
          stiffness: 240,
          mass: 0.9,
        });
  }, [expanded, progress, reduceMotion]);

  const panelStyle = useAnimatedStyle(() => ({
    height: PANEL_HEIGHT * progress.value,
    opacity: progress.value,
    transform: reduceMotion
      ? []
      : [{ translateY: 12 * (1 - progress.value) }],
  }));

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityLabel={expanded ? '收起表情选择器' : '插入 Bangumi 表情'}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={8}
          onPress={() => {
            playSelectionHaptic();
            setExpanded((current) => !current);
          }}
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

      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        style={[styles.panel, panelStyle]}
      >
        <BangumiEmojiPicker onSelect={onInsert} />
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    panel: {
      overflow: 'hidden',
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
    picker: {
      flex: 1,
    },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 2,
      paddingTop: 4,
    },
    tab: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    tabSelected: {
      backgroundColor: colors.accentSoft,
    },
    tabText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '600',
    },
    tabTextSelected: {
      color: colors.accent,
    },
    grid: {
      flex: 1,
    },
    gridContent: {
      paddingBottom: 8,
      paddingHorizontal: 2,
    },
    gridInner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      alignItems: 'center',
      aspectRatio: 1,
      justifyContent: 'center',
      padding: 4,
      width: `${100 / GRID_COLUMNS}%`,
    },
    cellPressed: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      opacity: 0.7,
    },
    image: {
      height: 36,
      width: 36,
    },
    pressed: { opacity: 0.62 },
  });
