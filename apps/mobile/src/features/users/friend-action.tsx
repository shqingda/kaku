import { useMemo } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HIT_SLOP } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { playSuccessHaptic } from '@/lib/haptics';

import { useSetUserFriend, useUserFriendship } from './use-friendship';

// 用户主页的好友操作：加好友立即生效（乐观更新），移除好友先确认
// （破坏性操作需要二次确认，但仅在真正不可逆时才这样做）。
export function FriendAction({
  nickname,
  username,
}: {
  nickname: string;
  username: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const friendshipQuery = useUserFriendship(username);
  const setFriend = useSetUserFriend(username);
  const isFriend = friendshipQuery.data === true;
  const busy = setFriend.isPending;

  function apply(shouldAdd: boolean) {
    setFriend.mutate(shouldAdd, {
      onError: (error) => {
        Alert.alert(
          shouldAdd ? '没有加为好友' : '没有移除好友',
          error.message,
        );
      },
      onSuccess: (nowFriend) => {
        if (nowFriend) {
          playSuccessHaptic();
        }
      },
    });
  }

  function toggle() {
    if (busy) {
      return;
    }

    if (isFriend) {
      Alert.alert(
        '移除好友？',
        `移除后不再接收 ${nickname} 的好友动态，对方也不会保留这条好友关系。`,
        [
          { style: 'cancel', text: '保留' },
          {
            onPress: () => apply(false),
            style: 'destructive',
            text: '移除',
          },
        ],
      );
      return;
    }

    apply(true);
  }

  if (friendshipQuery.isPending) {
    return (
      <View style={[styles.button, styles.pendingButton]}>
        <ActivityIndicator color={colors.muted} size="small" />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={
        isFriend ? `移除好友 ${nickname}` : `添加好友 ${nickname}`
      }
      accessibilityRole="button"
      accessibilityState={{ busy }}
      disabled={busy}
      hitSlop={HIT_SLOP}
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        isFriend ? styles.friendButton : styles.addButton,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={isFriend ? colors.muted : colors.surface}
          size="small"
        />
      ) : (
        <>
          <SymbolView
            name={
              isFriend
                ? { android: 'check', ios: 'checkmark', web: 'check' }
                : {
                    android: 'person_add',
                    ios: 'person.badge.plus',
                    web: 'person_add',
                  }
            }
            size={13}
            tintColor={isFriend ? colors.muted : colors.surface}
            weight="semibold"
          />
          <Text style={[styles.label, isFriend && styles.friendLabel]}>
            {isFriend ? '已加好友' : '加好友'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 13,
  },
  addButton: { backgroundColor: colors.accent },
  friendButton: {
    backgroundColor: colors.surface,
    borderColor: colors.track,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pendingButton: {
    backgroundColor: colors.surface,
    borderColor: colors.track,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 34,
    paddingHorizontal: 0,
  },
  label: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  friendLabel: { color: colors.muted },
  pressed: { opacity: 0.62 },
});
