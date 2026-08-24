import { type ComponentProps, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Animated,
  AccessibilityInfo,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import type { AuthSession } from '@/features/auth/model';
import { useNotifications } from '@/features/notifications/use-notifications';
import { useTheme } from '@/features/theme/theme-provider';

const MENU_WIDTH = 252;
const MENU_EDGE_MARGIN = 12;

export function ProfileMenu({ session }: { session: AuthSession }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();
  const notificationsQuery = useNotifications();
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const triggerRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [anchor, setAnchor] = useState({
    right: 0,
    top: 0,
  });
  const progress = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => subscription.remove();
  }, []);

  function openMenu() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowWidth = Dimensions.get('window').width;
      setAnchor({
        right: Math.max(MENU_EDGE_MARGIN, windowWidth - x - width),
        top: y + height + 8,
      });
      setVisible(true);
      progress.stopAnimation();
      progress.setValue(0);
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
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
    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(0);
      setVisible(false);
      return;
    }
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
              transition={120}
            />
          ) : (
            <SymbolView
              name={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              size={34}
              tintColor={colors.ink}
              weight="semibold"
            />
          )}
          {unreadCount > 0 ? (
            <View
              accessibilityLabel={`${unreadCount} 条未读通知`}
              style={styles.notificationBadge}
            >
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Modal
        animationType="none"
        onRequestClose={closeMenu}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={closeMenu}
          style={styles.backdrop}
        >
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no"
            onPress={closeMenu}
            style={StyleSheet.absoluteFill}
          />
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
                    transition={120}
                  />
                ) : (
                  <SymbolView
                    name={{
                      android: 'account_circle',
                      ios: 'person.crop.circle.fill',
                      web: 'account_circle',
                    }}
                    size={36}
                    tintColor={colors.subtle}
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
              badge={unreadCount}
              colors={colors}
              icon={{
                android: 'notifications',
                ios: 'bell',
                web: 'notifications',
              }}
              label="通知"
              onPress={() => {
                closeMenu();
                router.push('/notifications');
              }}
            />
            <MenuItem
              colors={colors}
              icon={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              label="我的时光机"
              onPress={goToProfile}
            />
            <MenuItem
              colors={colors}
              icon={{
                android: 'cloud',
                ios: 'icloud',
                web: 'cloud',
              }}
              label="外观与同步"
              onPress={() => {
                closeMenu();
                router.push('/settings');
              }}
            />
            <MenuItem
              colors={colors}
              icon={{
                android: 'settings',
                ios: 'gearshape',
                web: 'settings',
              }}
              label="账户与设备"
              onPress={goToAccount}
            />

            <View style={styles.divider} />

            <MenuItem
              colors={colors}
              icon={{
                android: 'logout',
                ios: 'rectangle.portrait.and.arrow.right',
                web: 'logout',
              }}
              label="退出登录"
              onPress={() => void handleSignOut()}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({
  badge,
  colors,
  icon,
  label,
  onPress,
}: {
  badge?: number;
  colors: ThemeColors;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityLabel={label}
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
          tintColor={colors.ink}
          weight="medium"
        />
      </View>
      <Text style={styles.itemText}>{label}</Text>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatarButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatar: { borderRadius: 18, height: 36, width: 36 },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderColor: colors.background,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  notificationBadgeText: {
    color: colors.surface,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.0001)',
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.track,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  userCopy: { flex: 1, marginLeft: 11, minWidth: 0 },
  nickname: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  username: { color: colors.muted, fontSize: 12, marginTop: 3 },
  divider: {
    backgroundColor: colors.divider,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  itemIcon: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  menuBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  itemPressed: { backgroundColor: colors.surfaceSoft },
  itemText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  pressed: { opacity: 0.62 },
});
