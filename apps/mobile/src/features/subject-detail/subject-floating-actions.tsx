import { Platform, StyleSheet, View } from 'react-native';
import { SPACING } from '@/constants/design';
import { HeaderIconButton } from '@/features/shared/header-icon-button';
import { shareBangumiEntity } from '@/lib/share';

export function FloatingBackButton({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}) {
  return (
    <View style={[styles.backButton, { top }]}>
      <HeaderIconButton
        accessibilityHint="返回上一个页面"
        accessibilityLabel="返回"
        icon={{
          android: 'arrow_back',
          ios: 'chevron.left',
          web: 'arrow_back',
        }}
        onPress={onPress}
        variant="floating"
      />
    </View>
  );
}

export function FloatingHomeButton({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}) {
  return (
    <View style={[styles.homeButton, { top }]}>
      <HeaderIconButton
        accessibilityHint="返回 Kaku 首页"
        accessibilityLabel="回到首页"
        icon={{ android: 'home_filled', ios: 'house', web: 'home' }}
        // Same iOS-only optical nudge as HeaderHomeButton.
        iconOffset={Platform.OS === 'ios' ? { y: 0.5 } : undefined}
        onPress={onPress}
        variant="floating"
      />
    </View>
  );
}

export function FloatingShareButton({
  path,
  title,
  top,
}: {
  path: string;
  title: string;
  top: number;
}) {
  return (
    <View style={[styles.shareButton, { top }]}>
      <HeaderIconButton
        accessibilityHint="通过系统分享面板分享这个条目"
        accessibilityLabel="分享条目"
        icon={{ android: 'share', ios: 'square.and.arrow.up', web: 'share' }}
        onPress={() => void shareBangumiEntity({ path, title })}
        variant="floating"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    left: SPACING.lg,
    position: 'absolute',
    zIndex: 10,
  },
  homeButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
  },
  shareButton: {
    position: 'absolute',
    right: SPACING.xxl * 2 + SPACING.xs,
    zIndex: 10,
  },
});
