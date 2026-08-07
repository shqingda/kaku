import { type ComponentProps, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import type { AuthSession } from '@/features/auth/model';

const MENU_WIDTH = 252;
const MENU_EDGE_MARGIN = 12;

export function ProfileMenu({ session }: { session: AuthSession }) {
  const { signOut } = useAuth();
  const triggerRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({
    right: 0,
    top: 0,
  });
  const progress = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowWidth = Dimensions.get('window').width;
      setAnchor({
        right: Math.max(MENU_EDGE_MARGIN, windowWidth - x - width),
        top: y + height + 8,
      });
      setVisible(true);
      progress.setValue(0);
      Animated.spring(progress, {
        damping: 24,
        mass: 0.9,
        stiffness: 340,
        toValue: 1,
        useNativeDriver,
      }).start();
    });
  }

  function closeMenu() {
    Animated.timing(progress, {
      duration: 110,
      toValue: 0,
      useNativeDriver,
    }).start(() => setVisible(false));
  }

  function goToAccount() {
    closeMenu();
    router.push('/account');
  }

  function goToProfile() {
    closeMenu();
    router.push({
      pathname: '/user/[username]',
      params: { username: session.user.username },
    });
  }

  async function handleSignOut() {
    closeMenu();
    await signOut();
  }

  return (
    <>
      <View collapsable={false} ref={triggerRef}>
        <Pressable
          accessibilityLabel="打开账户菜单"
          accessibilityRole="button"
          hitSlop={6}
          onPress={openMenu}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && styles.pressed,
          ]}
        >
          {session.user.avatarUrl ? (
            <Image
              contentFit="cover"
              source={session.user.avatarUrl}
              style={styles.avatar}
            />
          ) : (
            <SymbolView
              name={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              size={34}
              tintColor={COLORS.ink}
              weight="semibold"
            />
          )}
        </Pressable>
      </View>

      <Modal
        animationType="none"
        onRequestClose={closeMenu}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <Pressable
          accessibilityLabel="关闭账户菜单"
          onPress={closeMenu}
          style={styles.backdrop}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: progress,
                right: anchor.right,
                top: anchor.top,
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.userRow}>
              <View style={styles.avatarLarge}>
                {session.user.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={session.user.avatarUrl}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <SymbolView
                    name={{
                      android: 'account_circle',
                      ios: 'person.crop.circle.fill',
                      web: 'account_circle',
                    }}
                    size={36}
                    tintColor={COLORS.subtle}
                  />
                )}
              </View>
              <View style={styles.userCopy}>
                <Text numberOfLines={1} style={styles.nickname}>
                  {session.user.nickname}
                </Text>
                <Text numberOfLines={1} style={styles.username}>
                  @{session.user.username}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <MenuItem
              icon={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              label="我的时光机"
              onPress={goToProfile}
            />
            <MenuItem
              icon={{
                android: 'settings',
                ios: 'gearshape',
                web: 'settings',
              }}
              label="登录设备管理"
              onPress={goToAccount}
            />

            <View style={styles.divider} />

            <MenuItem
              icon={{
                android: 'logout',
                ios: 'rectangle.portrait.and.arrow.right',
                web: 'logout',
              }}
              label="退出登录"
              onPress={() => void handleSignOut()}
            />
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
      ]}
    >
      <View style={styles.itemIcon}>
        <SymbolView
          name={icon}
          size={17}
          tintColor={COLORS.ink}
          weight="medium"
        />
      </View>
      <Text style={styles.itemText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatar: { borderRadius: 18, height: 36, width: 36 },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.0001)',
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    elevation: 16,
    paddingVertical: 6,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: MENU_WIDTH,
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarLarge: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  userCopy: { flex: 1, marginLeft: 11, minWidth: 0 },
  nickname: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  username: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  divider: {
    backgroundColor: COLORS.track,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  itemIcon: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  itemPressed: { backgroundColor: COLORS.track },
  itemText: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  pressed: { opacity: 0.62 },
});
