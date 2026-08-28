import { useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { HIT_SLOP, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import {
  CHANGELOG,
  type ChangelogEntry,
} from '@/features/changelog/changelog-data';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/use-reduce-motion';

const RELEASES_URL = 'https://github.com/shqingda/kaku/releases';

// 与 AppSheet 进入弹簧一致：临界阻尼（damping ratio ≈ 1.0），展开收起
// 随时可以被下一次点击打断，从当前进度继续，不会跳变。
const EXPAND_SPRING = { damping: 35, mass: 1, stiffness: 300 } as const;

export default function ChangelogScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const appVersion = Constants.expoConfig?.version;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '更新日志' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {CHANGELOG.map((entry, index) => (
          <VersionCard
            colors={colors}
            entry={entry}
            isCurrent={entry.version === appVersion}
            key={entry.version}
            styles={styles}
            initiallyExpanded={index === 0}
          />
        ))}
        <Pressable
          accessibilityLabel="在 GitHub 查看完整发布记录"
          accessibilityRole="link"
          hitSlop={HIT_SLOP}
          onPress={() => {
            void Linking.openURL(RELEASES_URL).catch(() =>
              Alert.alert('暂时无法打开', '请检查网络后重试。'),
            );
          }}
          style={({ pressed }) => [styles.releasesLink, pressed && styles.pressed]}
        >
          <Text style={styles.releasesLinkText}>在 GitHub 查看完整发布记录</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function VersionCard({
  colors,
  entry,
  initiallyExpanded,
  isCurrent,
  styles,
}: {
  colors: ThemeColors;
  entry: ChangelogEntry;
  initiallyExpanded: boolean;
  isCurrent: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  const reduceMotion = useReduceMotion();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  // 进度 0（收起）到 1（展开），高度跟随进度伸缩，动画始终从当前值出发。
  const progress = useSharedValue(initiallyExpanded ? 1 : 0);
  const contentHeight = useSharedValue(0);

  function toggle() {
    playSelectionHaptic();
    const next = !expanded;
    setExpanded(next);
    if (reduceMotion) {
      progress.value = next ? 1 : 0;
      return;
    }
    progress.value = withSpring(next ? 1 : 0, EXPAND_SPRING);
  }

  const bodyStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight.value,
    opacity: progress.value,
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={`版本 ${entry.version}，${expanded ? '收起' : '展开'}更新内容`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.chevronBadge}>
          <Animated.View style={chevronStyle}>
            <SymbolView
              name={{
                android: 'keyboard_arrow_down',
                ios: 'chevron.down',
                web: 'keyboard_arrow_down',
              }}
              size={18}
              tintColor={colors.muted}
              weight="semibold"
            />
          </Animated.View>
        </View>
        <View style={styles.headingCopy}>
          <View style={styles.headingRow}>
            <Text style={styles.version}>v{entry.version}</Text>
            {isCurrent ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>当前版本</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.date}>{entry.date}</Text>
        </View>
      </Pressable>
      <Animated.View style={[styles.body, bodyStyle]}>
        <View
          onLayout={(event) => {
            contentHeight.value = event.nativeEvent.layout.height;
          }}
          style={styles.notes}
        >
          {entry.notes.map((note) => (
            <View key={note} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { gap: 12, padding: 20, paddingBottom: 44 },
    card: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 22,
      overflow: 'hidden',
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 76,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    chevronBadge: {
      alignItems: 'center',
      backgroundColor: colors.track,
      borderCurve: 'continuous',
      borderRadius: 21,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    headingCopy: { flex: 1, marginLeft: 14 },
    headingRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    version: {
      color: colors.ink,
      fontSize: TYPE.title.fontSize,
      fontWeight: '800',
      letterSpacing: TYPE.title.letterSpacing,
    },
    currentBadge: {
      backgroundColor: colors.accentSoft,
      borderCurve: 'continuous',
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    currentBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
    date: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      marginTop: 3,
    },
    body: { overflow: 'hidden' },
    notes: { paddingHorizontal: 20, paddingBottom: 18 },
    noteRow: { flexDirection: 'row', marginTop: 8 },
    noteDot: {
      backgroundColor: colors.subtle,
      borderRadius: 2,
      height: 4,
      marginTop: 9,
      width: 4,
    },
    noteText: {
      color: colors.muted,
      flex: 1,
      fontSize: TYPE.body.fontSize,
      lineHeight: TYPE.body.lineHeight,
      marginLeft: 10,
    },
    releasesLink: { alignSelf: 'center', marginTop: 6, padding: 10 },
    releasesLinkText: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '600',
    },
    pressed: { opacity: 0.62 },
  });
