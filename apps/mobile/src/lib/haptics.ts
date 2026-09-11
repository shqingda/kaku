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

// 破坏性操作真正生效后（删除回复、删除目录、取消收藏）：与成功不同的
// 低沉提示，让"这条操作不可逆"被手感知觉到。
export function playWarningHaptic() {
  runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  );
}

// 校验失败：与网络错误的 Alert 文案同帧出现。
export function playErrorHaptic() {
  runHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
}

// 下拉刷新触发：轻微确认"刷新已经开始了"。
export function playLightHaptic() {
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
