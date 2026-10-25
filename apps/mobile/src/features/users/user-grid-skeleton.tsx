import { StyleSheet, View } from 'react-native';

import { SPACING } from '@/constants/design';
import { SkeletonList } from '@/features/shared/skeleton-list';

// 好友和实体收藏保留各自的列数，只组合现有列表骨架。
export function UserGridSkeleton({
  accessibilityLabel,
  columns,
  rowHeight,
}: {
  accessibilityLabel: string;
  columns: 2 | 3;
  rowHeight: number;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.grid}>
      {Array.from({ length: columns }, (_, column) => (
        <View key={column} style={styles.column}>
          <SkeletonList count={3} rowHeight={rowHeight} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: SPACING.md },
  column: { flex: 1 },
});
