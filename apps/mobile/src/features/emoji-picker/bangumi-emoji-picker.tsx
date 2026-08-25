import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import { imageBbcode, imageUrlError } from '@/features/rich-text/rich-text-input';

import { EMOJI_CATEGORIES } from './emoji-catalog';

const EMOJI_PANEL_HEIGHT = 236;
const IMAGE_PANEL_HEIGHT = 132;
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
export function BangumiRichTextToolbar({
  onInsert,
}: {
  onInsert: (text: string) => boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  const [panel, setPanel] = useState<'emoji' | 'image' | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const progress = useSharedValue(0);
  const panelHeight = useSharedValue(0);

  useEffect(() => {
    const expanded = panel !== null;
    progress.value = reduceMotion
      ? withTiming(expanded ? 1 : 0, { duration: 160 })
      : withSpring(expanded ? 1 : 0, {
          damping: 22,
          stiffness: 240,
          mass: 0.9,
        });
    const nextHeight = panel === 'emoji'
      ? EMOJI_PANEL_HEIGHT
      : panel === 'image'
        ? IMAGE_PANEL_HEIGHT
        : 0;
    panelHeight.value = reduceMotion
      ? withTiming(nextHeight, { duration: 160 })
      : withSpring(nextHeight, { damping: 22, stiffness: 240, mass: 0.9 });
  }, [panel, panelHeight, progress, reduceMotion]);

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
    opacity: progress.value,
    transform: reduceMotion
      ? []
      : [{ translateY: 12 * (1 - progress.value) }],
  }));

  function togglePanel(next: 'emoji' | 'image') {
    playSelectionHaptic();
    setImageError(null);
    setPanel((current) => current === next ? null : next);
  }

  function insertImage() {
    const error = imageUrlError(imageUrl);
    if (error) {
      setImageError(error);
      return;
    }

    if (!onInsert(imageBbcode(imageUrl))) {
      setImageError('内容已达到字数上限，请先删减一些文字');
      return;
    }

    playSelectionHaptic();
    setImageUrl('');
    setImageError(null);
    setPanel(null);
  }

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityLabel={panel === 'emoji' ? '收起表情选择器' : '插入 Bangumi 表情'}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === 'emoji' }}
          hitSlop={8}
          onPress={() => togglePanel('emoji')}
          style={({ pressed }) => [
            styles.toggleButton,
            panel === 'emoji' && styles.toggleButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              android: panel === 'emoji' ? 'keyboard_arrow_up' : 'mood',
              ios: panel === 'emoji' ? 'chevron.up' : 'face.smiling',
              web: panel === 'emoji' ? 'keyboard_arrow_up' : 'mood',
            }}
            size={16}
            tintColor={panel === 'emoji' ? colors.accent : colors.muted}
            weight="semibold"
          />
          <Text style={[styles.toggleText, panel === 'emoji' && styles.toggleTextActive]}>
            表情
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={panel === 'image' ? '收起图片链接输入' : '插入外链图片'}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === 'image' }}
          hitSlop={8}
          onPress={() => togglePanel('image')}
          style={({ pressed }) => [
            styles.toggleButton,
            panel === 'image' && styles.toggleButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ android: 'image', ios: 'photo', web: 'image' }}
            size={16}
            tintColor={panel === 'image' ? colors.accent : colors.muted}
            weight="semibold"
          />
          <Text style={[styles.toggleText, panel === 'image' && styles.toggleTextActive]}>
            图片
          </Text>
        </Pressable>
        <Text style={styles.hint}>图片需使用公开链接</Text>
      </View>

      <Animated.View
        pointerEvents={panel ? 'auto' : 'none'}
        style={[styles.panel, panelStyle]}
      >
        {panel === 'emoji' ? <BangumiEmojiPicker onSelect={onInsert} /> : null}
        {panel === 'image' ? (
          <View style={styles.imageForm}>
            <View style={styles.imageInputRow}>
              <TextInput
                accessibilityLabel="图片链接"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onChangeText={(value) => {
                  setImageUrl(value);
                  if (imageError) setImageError(null);
                }}
                onSubmitEditing={insertImage}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.subtle}
                returnKeyType="done"
                style={styles.imageInput}
                value={imageUrl}
              />
              <Pressable
                accessibilityLabel="插入图片链接"
                accessibilityRole="button"
                onPress={insertImage}
                style={({ pressed }) => [styles.insertButton, pressed && styles.pressed]}
              >
                <Text style={styles.insertButtonText}>插入</Text>
              </Pressable>
            </View>
            <Text accessibilityRole={imageError ? 'alert' : undefined} style={imageError ? styles.imageError : styles.imageHelp}>
              {imageError ?? 'Kaku 不会上传图片，只会把公开链接插入到当前光标处'}
            </Text>
          </View>
        ) : null}
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
      gap: 4,
      minHeight: 32,
    },
    toggleButton: {
      alignItems: 'center',
      borderRadius: 9,
      flexDirection: 'row',
      gap: 4,
      minHeight: 32,
      paddingHorizontal: 8,
    },
    toggleButtonActive: {
      backgroundColor: colors.surfaceSoft,
    },
    toggleText: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    toggleTextActive: {
      color: colors.accent,
    },
    hint: {
      color: colors.subtle,
      flex: 1,
      fontSize: 11,
      textAlign: 'right',
    },
    imageForm: { paddingBottom: 10, paddingTop: 14 },
    imageInputRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    imageInput: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      color: colors.ink,
      flex: 1,
      fontSize: 14,
      minHeight: 44,
      paddingHorizontal: 12,
    },
    insertButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 16,
    },
    insertButtonText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
    imageHelp: { color: colors.subtle, fontSize: 11, lineHeight: 17, marginTop: 8 },
    imageError: { color: colors.accent, fontSize: 11, lineHeight: 17, marginTop: 8 },
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
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tabSelected: {
      backgroundColor: colors.accentSoft,
    },
    tabText: {
      color: colors.muted,
      fontSize: 12,
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
      padding: 3,
      width: `${100 / GRID_COLUMNS}%`,
    },
    cellPressed: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      opacity: 0.7,
    },
    image: {
      height: 28,
      width: 28,
    },
    pressed: { opacity: 0.62 },
  });
