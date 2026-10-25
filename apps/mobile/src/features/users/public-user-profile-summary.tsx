import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { FriendAction } from './friend-action';
import type { PublicUserProfile } from './model';
import { ProfileOverflow } from './profile-overflow';

export function PublicUserProfileSummary({
  user,
  showActions,
  onOpenEntities,
}: {
  user: PublicUserProfile;
  showActions: boolean;
  onOpenEntities?: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarFallback}>
            {user.nickname.slice(0, 1)}
          </Text>
          {user.avatarUrl ? (
            <Image
              contentFit="cover"
              source={user.avatarUrl}
              style={StyleSheet.absoluteFill}
              transition={120}
            />
          ) : null}
        </View>
        <View style={styles.profileMain}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.sign ? (
            <Text numberOfLines={3} style={styles.sign}>
              {user.sign}
            </Text>
          ) : null}
        </View>
        {showActions ? (
          <View style={styles.friendAction}>
            <FriendAction
              nickname={user.nickname}
              username={user.username}
            />
            <ProfileOverflow
              nickname={user.nickname}
              userId={user.id}
              username={user.username}
            />
          </View>
        ) : null}
      </View>
      {onOpenEntities ? (
        <Pressable
          accessibilityLabel="查看角色与人物收藏"
          accessibilityRole="button"
          onPress={onOpenEntities}
          style={({ pressed }) => [
            styles.entityEntry,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.entityEntryIcon}>
            <SymbolView
              name={{
                android: 'favorite',
                ios: 'person.2.fill',
                web: 'favorite',
              }}
              size={19}
              tintColor={colors.accent}
              weight="semibold"
            />
          </View>
          <View style={styles.entityEntryMain}>
            <Text style={styles.entityEntryTitle}>角色与人物</Text>
            <Text style={styles.entityEntryHint}>查看公开收藏</Text>
          </View>
          <SymbolView
            name={{
              android: 'chevron_right',
              ios: 'chevron.right',
              web: 'chevron_right',
            }}
            size={13}
            tintColor={colors.subtle}
            weight="semibold"
          />
        </Pressable>
      ) : null}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  profile: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  avatarFallback: { color: colors.subtle, ...TYPE.titleLarge, fontWeight: '800' },
  profileMain: { flex: 1, marginLeft: SPACING.lg },
  friendAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.md,
    marginTop: SPACING.xs / 2,
  },
  nickname: {
    color: colors.ink,
    ...TYPE.titleLarge,
    fontWeight: '800',
  },
  username: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  sign: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
  entityEntry: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: SPACING.lg,
  },
  entityEntryIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  entityEntryMain: { flex: 1, marginLeft: SPACING.md },
  entityEntryTitle: { color: colors.ink, ...TYPE.body, fontWeight: '800' },
  entityEntryHint: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  pressed: { opacity: 0.62 },
});
