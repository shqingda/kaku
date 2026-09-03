import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    'Kaku 会记录当前登录设备，以便你在账户页查看并撤销其他设备会话。撤销会话或断开 Bangumi 后，Kaku 会删除对应的授权凭据与所有会话。',
  ],
  [
    '基础设施与缓存',
    'Kaku 使用 Cloudflare Workers、D1 与边缘缓存提供登录交接、会话管理和公开数据代理。Cloudflare 可能记录用于安全与故障排查的短期请求元数据（如 IP、设备信息与时间），不包含内容正文。边缘缓存只包含条目、榜单等公开数据，不含个人信息。',
  ],
  [
    '你的控制权',
    '你可以在 App 内断开 Bangumi（删除全部凭据与会话）、退出当前设备或撤销其他设备会话、清除本地界面错误记录。我们不出售个人数据，也不将收藏与兴趣用于第三方广告画像。',
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
          <Text style={styles.updated}>最后更新：2026 年 8 月 18 日</Text>
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
    content: { padding: 20, paddingBottom: 44 },
    introBlock: { marginBottom: 8, paddingTop: 8 },
    intro: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 26,
    },
    updated: { color: colors.subtle, fontSize: 12, marginTop: 12 },
    section: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingBottom: 24,
      paddingTop: 22,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 8,
    },
    sectionBody: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 24,
    },
  });
