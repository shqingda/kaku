import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { HIT_SLOP } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { ReportSheet } from './report-sheet';

// 通用"举报"入口：一个"⋯"按钮 + 举报弹层，可挂在话题头、回复卡片等位置。
export function ReportButton({
  accessibilityLabel,
  label,
  targetId,
  type,
}: {
  accessibilityLabel: string;
  label: string;
  targetId: number;
  type: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ android: 'more_horiz', ios: 'ellipsis', web: 'more_horiz' }}
          size={17}
          tintColor={colors.muted}
          weight="semibold"
        />
      </Pressable>
      <ReportSheet
        onClose={() => setVisible(false)}
        onSubmitted={() =>
          Alert.alert('举报已提交', '感谢你的反馈，Bangumi 会进行审核。')
        }
        target={{ id: targetId, label, type }}
        visible={visible}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.track,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: { opacity: 0.62 },
});
