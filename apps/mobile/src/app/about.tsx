import { type ComponentProps } from 'react';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { openExternalUrl } from '@/lib/open-url';

const WEBSITE_URL = 'https://kaku-web.shqingda.workers.dev';

type AboutLink = {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  url?: string;
  route?: string;
};

const productLinks: AboutLink[] = [
  {
    icon: { android: 'language', ios: 'globe', web: 'language' },
    label: 'Kaku 官网',
    url: WEBSITE_URL,
  },
  {
    icon: {
      android: 'receipt_long',
      ios: 'list.bullet.rectangle',
      web: 'receipt_long',
    },
    label: '更新日志',
    route: '/changelog',
  },
  {
    icon: { android: 'help_outline', ios: 'questionmark.circle', web: 'help_outline' },
    label: '使用帮助',
    url: `${WEBSITE_URL}/#faq`,
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
    route: '/privacy',
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

export default function AboutScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const version = Constants.expoConfig?.version ?? '开发版';

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '关于 Kaku' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            accessibilityLabel="Kaku"
            contentFit="cover"
            source={require('../../assets/images/kaku-icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Kaku</Text>
          <Text style={styles.version}>版本 {version}</Text>
          <Text style={styles.summary}>
            为移动端重新设计的 Bangumi 第三方客户端。
          </Text>
        </View>

        <AboutLinkGroup colors={colors} links={productLinks} />
        <AboutLinkGroup colors={colors} links={legalLinks} />

        <Text style={styles.footer}>用心记录每一次观看与阅读。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function AboutLinkGroup({ colors, links }: { colors: ThemeColors; links: AboutLink[] }) {
  const router = useRouter();
  const styles = createStyles(colors);

  return (
    <View style={styles.group}>
      {links.map((link, index) => (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="link"
          key={link.label}
          onPress={() =>
            link.route
              ? router.push(link.route as Href)
              : void openExternalUrl(link.url ?? '')
          }
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
              tintColor={colors.accent}
              weight="medium"
            />
          </View>
          <Text style={styles.rowLabel}>{link.label}</Text>
          <SymbolView
            name={
              link.route
                ? { android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }
                : { android: 'open_in_new', ios: 'arrow.up.right', web: 'open_in_new' }
            }
            size={13}
            tintColor={colors.subtle}
          />
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 20, paddingBottom: 44 },
  hero: { alignItems: 'center', paddingBottom: 30, paddingTop: 20 },
  logo: {
    borderRadius: 21,
    height: 80,
    width: 80,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 18,
  },
  version: { color: colors.subtle, fontSize: 12, marginTop: 5 },
  summary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 13,
    textAlign: 'center',
  },
  group: {
    backgroundColor: colors.surface,
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
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowLabel: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 13,
  },
  footer: {
    color: colors.subtle,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
});
