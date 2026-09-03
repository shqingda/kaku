// 已登录的资料卡：头像、昵称与跳转公开主页的入口。
import { useMemo } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountProfileCard() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="查看我的 Bangumi 主页"
      accessibilityRole="link"
      onPress={() =>
        router.push({
          pathname: '/user/[username]',
          params: { username: session.user.username },
        })
      }
      style={({ pressed }) => [
        styles.profileCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        <SymbolView
          name={{
            android: 'account_circle',
            ios: 'person.crop.circle.fill',
            web: 'account_circle',
          }}
          size={72}
          tintColor={colors.subtle}
        />
        {session.user.avatarUrl ? (
          <Image
            contentFit="cover"
            source={session.user.avatarUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <Text style={styles.nickname}>{session.user.nickname}</Text>
      <Text style={styles.username}>@{session.user.username}</Text>
      <View style={styles.connectedBadge}>
        <View style={styles.connectedDot} />
        <Text style={styles.connectedText}>已连接 Bangumi</Text>
      </View>
      <View style={styles.profileLink}>
        <Text style={styles.profileLinkText}>查看公开主页</Text>
        <SymbolView
          name={{
            android: 'chevron_right',
            ios: 'chevron.right',
            web: 'chevron_right',
          }}
          size={13}
          tintColor={colors.subtle}
        />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 32,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  nickname: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
  },
  username: { color: colors.muted, fontSize: 14, marginTop: 4 },
  connectedBadge: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 99,
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectedDot: {
    backgroundColor: '#34C759',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  connectedText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  profileLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 14,
  },
  profileLinkText: { color: colors.subtle, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
