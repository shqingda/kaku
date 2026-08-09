import type { ComponentProps } from 'react';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useQueryClient } from '@tanstack/react-query';
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

import { COLORS } from '@/constants/design';
import { queryPersister } from '@/lib/query-persister';

const WEBSITE_URL = 'https://kaku-web.shqingda.workers.dev';

type AboutLink = {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  url: string;
};

const productLinks: AboutLink[] = [
  {
    icon: { android: 'language', ios: 'globe', web: 'language' },
    label: 'Kaku 官网',
    url: WEBSITE_URL,
  },
  {
    icon: { android: 'help_outline', ios: 'questionmark.circle', web: 'help_outline' },
    label: '使用帮助',
    url: `${WEBSITE_URL}/support`,
  },
  {
    icon: { android: 'feedback', ios: 'bubble.left.and.text.bubble.right', web: 'feedback' },
    label: '反馈问题',
    url: 'https://github.com/shqingda/kaku/issues/new',
  },
];

const legalLinks: AboutLink[] = [
  {
    icon: { android: 'privacy_tip', ios: 'hand.raised', web: 'privacy_tip' },
    label: '隐私政策',
    url: `${WEBSITE_URL}/privacy`,
  },
  {
    icon: { android: 'description', ios: 'doc.text', web: 'description' },
    label: '服务条款',
    url: `${WEBSITE_URL}/terms`,
  },
  {
    icon: { android: 'code', ios: 'chevron.left.forwardslash.chevron.right', web: 'code' },
    label: '源代码',
    url: 'https://github.com/shqingda/kaku',
  },
];

async function openExternalUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('暂时无法打开', '请检查网络后重试。');
  }
}

export default function AboutScreen() {
  const queryClient = useQueryClient();
  const version = Constants.expoConfig?.version ?? '开发版';

  async function clearPublicCache() {
    queryClient.removeQueries({
      predicate: (query) => query.meta?.persist === true,
    });

    try {
      await queryPersister.removeClient();
      Alert.alert('缓存已清除');
    } catch {
      Alert.alert('清除失败', '请稍后重试。');
    }
  }

  function confirmClearCache() {
    Alert.alert(
      '清除浏览缓存？',
      '将删除离线保存的公开条目、频道与排行榜，不会退出登录或删除收藏。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => void clearPublicCache(),
          style: 'destructive',
          text: '清除',
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '关于 Kaku' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.title}>Kaku</Text>
          <Text style={styles.version}>版本 {version}</Text>
          <Text style={styles.summary}>
            为移动端重新设计的 Bangumi 第三方客户端。
          </Text>
        </View>

        <AboutLinkGroup links={productLinks} />
        <AboutLinkGroup links={legalLinks} />
        <View style={styles.group}>
          <Pressable
            accessibilityLabel="清除浏览缓存"
            accessibilityRole="button"
            onPress={confirmClearCache}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowIconMuted}>
              <SymbolView
                name={{
                  android: 'delete_sweep',
                  ios: 'trash',
                  web: 'delete_sweep',
                }}
                size={18}
                tintColor={COLORS.muted}
                weight="medium"
              />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabelWithoutMargin}>清除浏览缓存</Text>
              <Text style={styles.rowDescription}>登录和收藏数据不会受影响</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.footer}>用心记录每一次观看与阅读。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function AboutLinkGroup({ links }: { links: AboutLink[] }) {
  return (
    <View style={styles.group}>
      {links.map((link, index) => (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="link"
          key={link.label}
          onPress={() => void openExternalUrl(link.url)}
          style={({ pressed }) => [
            styles.row,
            index > 0 && styles.rowBorder,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.rowIcon}>
            <SymbolView
              name={link.icon}
              size={18}
              tintColor={COLORS.accent}
              weight="medium"
            />
          </View>
          <Text style={styles.rowLabel}>{link.label}</Text>
          <SymbolView
            name={{
              android: 'open_in_new',
              ios: 'arrow.up.right',
              web: 'open_in_new',
            }}
            size={13}
            tintColor={COLORS.subtle}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 44 },
  hero: { alignItems: 'center', paddingBottom: 30, paddingTop: 20 },
  logo: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 24,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  logoText: { color: COLORS.accent, fontSize: 38, fontWeight: '800' },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 18,
  },
  version: { color: COLORS.subtle, fontSize: 12, marginTop: 5 },
  summary: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 13,
    textAlign: 'center',
  },
  group: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
  },
  rowBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowIconMuted: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowCopy: { flex: 1, marginLeft: 13 },
  rowLabel: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 13,
  },
  rowLabelWithoutMargin: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  rowDescription: { color: COLORS.subtle, fontSize: 11, marginTop: 3 },
  footer: {
    color: COLORS.subtle,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
});
