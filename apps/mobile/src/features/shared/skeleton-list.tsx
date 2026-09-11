import { StyleSheet, View } from 'react-native';

import { SkeletonBox } from '@/features/shared/skeleton';

// 列表加载骨架：与最终内容同构的占位，替代「正在读取…」文字卡，
// 让布局在数据到达前就稳定（加载完成时页面不跳版）。
// - vertical：N 行等高占位行（日志、通知等纵向列表行）。
// - horizontal：3 张封面卡占位（首页、频道的热门条目横滑区），与
//   home-media-section 的封面卡骨架同构。
// accessibilityLabel 传屏幕原有的「正在读取…」文案以保持读屏播报；
// 不传时整块对读屏隐藏（纯装饰占位）。
export function SkeletonList({
  accessibilityLabel,
  count = 4,
  direction = 'vertical',
  rowHeight = 76,
}: {
  accessibilityLabel?: string;
  count?: number;
  direction?: 'vertical' | 'horizontal';
  rowHeight?: number;
}) {
  const containerProps = accessibilityLabel
    ? { accessible: true, accessibilityLabel }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

  if (direction === 'horizontal') {
    return (
      <View {...containerProps} style={styles.mediaRow}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.mediaCard}>
            <SkeletonBox borderRadius={14} height={146} width="100%" />
            <SkeletonBox height={13} width="88%" />
            <SkeletonBox height={11} width="55%" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View {...containerProps}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={index < count - 1 ? styles.row : null}>
          <SkeletonBox borderRadius={18} height={rowHeight} width="100%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  mediaRow: {
    flexDirection: 'row',
    gap: 13,
  },
  mediaCard: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 9,
  },
});
