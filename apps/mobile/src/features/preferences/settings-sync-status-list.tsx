import { useEffect, type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { HIT_SLOP } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import type { SettingsStyles } from './settings-styles';

const STATUS_GREEN = '#34C759';
const STATUS_RED = '#FF3B30';
type SyncStatus = 'failed' | 'idle' | 'success' | 'syncing';
type SymbolName = ComponentProps<typeof SymbolView>['name'];

type SyncChannel = {
  key: string;
  label: string;
  error: string | null;
  syncing: boolean;
  ready: boolean;
  onRetry: () => void;
};

const STATUS_ICONS: Record<SyncStatus, SymbolName> = {
  failed: { android: 'cancel', ios: 'xmark.circle.fill', web: 'cancel' },
  idle: { android: 'cloud_off', ios: 'icloud.slash', web: 'cloud_off' },
  success: {
    android: 'check_circle',
    ios: 'checkmark.circle.fill',
    web: 'check_circle',
  },
  syncing: {
    android: 'sync',
    ios: 'arrow.triangle.2.circlepath',
    web: 'sync',
  },
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  failed: '同步失败',
  idle: '未同步',
  success: '已同步',
  syncing: '正在同步',
};

function getSyncStatus({
  available,
  enabled,
  error,
  signedIn,
  syncing,
}: {
  available: boolean;
  enabled: boolean;
  error: string | null;
  signedIn: boolean;
  syncing: boolean;
}): SyncStatus {
  if (!signedIn || !enabled || !available) return 'idle';
  if (syncing) return 'syncing';
  if (error) return 'failed';
  return 'success';
}

export function SettingsSyncStatusList({ available, enabled, signedIn, channels, colors, styles }: {
  available: boolean;
  enabled: boolean;
  signedIn: boolean;
  channels: readonly SyncChannel[];
  colors: ThemeColors;
  styles: SettingsStyles;
}) {
  return (
    <View style={styles.statusList}>
      {!available ? <Text style={styles.rowDescription}>云同步暂不可用，本机设置和记录仍可使用。</Text> : null}
      {channels.map(channel => (
        <SyncStatusRow
          colors={colors}
          key={channel.key}
          label={channel.label}
          onRetry={channel.onRetry}
          status={getSyncStatus({ available, enabled: enabled && channel.ready,
            error: channel.error, signedIn, syncing: channel.syncing })}
          styles={styles}
        />
      ))}
    </View>
  );
}

function SyncingIcon({ color }: { color: string }) {
  const reduceMotion = useReduceMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [reduceMotion, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={spinStyle}>
      <SymbolView
        name={STATUS_ICONS.syncing}
        size={15}
        tintColor={color}
        weight="medium"
      />
    </Animated.View>
  );
}

function SyncStatusRow({
  colors,
  label,
  onRetry,
  status,
  styles,
}: {
  colors: ThemeColors;
  label: string;
  onRetry: () => void;
  status: SyncStatus;
  styles: SettingsStyles;
}) {
  const tint =
    status === 'success'
      ? STATUS_GREEN
      : status === 'failed'
        ? STATUS_RED
        : colors.subtle;
  const content = (
    <>
      {status === 'syncing' ? (
        <SyncingIcon color={tint} />
      ) : (
        <SymbolView
          name={STATUS_ICONS[status]}
          size={15}
          tintColor={tint}
          weight="medium"
        />
      )}
      <Text style={styles.statusLabel}>
        {label} · {STATUS_LABELS[status]}{status === 'failed' ? ' · 重试' : ''}
      </Text>
    </>
  );

  if (status === 'failed') {
    return (
      <Pressable
        accessibilityHint="点此重试"
        accessibilityLabel={`${label}，${STATUS_LABELS[status]}`}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        onPress={onRetry}
        style={({ pressed }) => [styles.statusRow, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`${label}，${STATUS_LABELS[status]}`}
      style={styles.statusRow}
    >
      {content}
    </View>
  );
}
