import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

const sections = [
  [
    '我们处理的信息',
    '连接 Bangumi 后，Kaku 会代表你访问并展示 Bangumi 用户 ID、昵称、头像、收藏状态、章节进度、评分与好友动态。Kaku 从不接收或保存你的 Bangumi 密码。',
  ],
  [
    '授权与凭据',
    '登录通过系统浏览器在 Bangumi 官方页面完成。Bangumi OAuth 授权凭据加密保存在 Kaku 的服务器（Cloudflare D1 数据库）中，仅用于代表你向 Bangumi 请求已授权的功能。移动端只保存 Kaku 自己的会话凭据。',
  ],
  [
    '数据如何流动',
    '评论、收藏、动态、通知等内容只在你使用 App 时实时转发给 Bangumi 或从 Bangumi 读取，不会写入 Kaku 的数据库，也不会被分析、标记或建立兴趣画像。界面错误记录只保存在你的设备本地，不会自动上传。',
  ],
  [
    '会话与设备',
    'Kaku 会记录设备型号、登录与最近使用时间，并使用应用范围设备标识的摘要识别同一账号下的重复登录；不上传原始系统设备标识，也不将其用于广告追踪。退出登录只撤销当前设备的会话，不影响其他设备。',
  ],
  [
    '基础设施与缓存',
    'Kaku 使用 Cloudflare Workers、D1 与边缘缓存提供登录交接、会话管理和公开数据代理。Cloudflare 可能记录用于安全与故障排查的短期请求元数据（如 IP、设备信息与时间），不包含内容正文。边缘缓存只包含条目、榜单等公开数据，不含个人信息。',
  ],
  [
    '你的控制权',
    '你可以在 App 内退出登录，或在设备列表中退出其他设备。我们不出售个人数据，也不将收藏与兴趣用于第三方广告画像。',
  ],
] as const;

export default function PrivacyScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '隐私政策' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <Text style={styles.intro}>
            Kaku 只处理提供产品功能所必需的数据。下面的说明试图准确描述数据如何流动、存储在哪里，以及你如何撤回访问。
          </Text>
          <Text style={styles.updated}>最后更新：2026 年 10 月 28 日</Text>
        </View>
        {sections.map(([title, body]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionBody}>{body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { padding: SPACING.xl, paddingBottom: SPACING.xxl },
    introBlock: { marginBottom: SPACING.sm, paddingTop: SPACING.sm },
    intro: {
      color: colors.ink,
      ...TYPE.body,
      fontWeight: '600',
    },
    updated: { color: colors.subtle, ...TYPE.caption, marginTop: SPACING.md },
    section: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingBottom: SPACING.xl,
      paddingTop: SPACING.xl,
    },
    sectionTitle: {
      color: colors.ink,
      ...TYPE.body,
      fontWeight: '700',
      marginBottom: SPACING.sm,
    },
    sectionBody: {
      color: colors.muted,
      ...TYPE.body,
    },
  });
