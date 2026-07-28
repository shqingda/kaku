import * as Haptics from 'expo-haptics';

function runHaptic(effect: () => Promise<void>) {
  // 触感只是交互增强。旧 Dev Client 尚未链接原生模块时，不应让核心操作报错。
  try {
    void effect().catch(() => undefined);
  } catch {
    // 某些原生壳可能在创建 Promise 前就抛错，同样安全降级。
  }
}

export function playSelectionHaptic() {
  runHaptic(() => Haptics.selectionAsync());
}

export function playEpisodeToggleHaptic(wasWatched: boolean) {
  runHaptic(() =>
    Haptics.impactAsync(
      wasWatched
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    ),
  );
}

export function playSuccessHaptic() {
  runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}
