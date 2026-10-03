import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// 骨架、卡片和弹层共用一份系统监听；每个组件仍通过同一个 Hook 读取。
// 未确认系统设置时先减少动态效果，避免先播放运动再撤销，也作为读取失败的回退。
let reduceMotion = true;
const listeners = new Set<() => void>();
let stopListening: (() => void) | undefined;

function updateReduceMotion(enabled: boolean) {
  if (reduceMotion === enabled) return;
  reduceMotion = enabled;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    let active = true;
    let receivedChange = false;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (!active) return;
        receivedChange = true;
        updateReduceMotion(enabled);
      },
    );

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        // 较晚返回的初始读取不能覆盖新事件，也不能写入下一轮订阅。
        if (active && !receivedChange) updateReduceMotion(enabled);
      })
      .catch(() => {
        // 系统查询失败时保留安全值，仍继续监听后续设置变化。
      });

    stopListening = () => {
      active = false;
      subscription.remove();
    };
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopListening?.();
      stopListening = undefined;
      reduceMotion = true;
    }
  };
}

const getSnapshot = () => reduceMotion;
const getServerSnapshot = () => true;

// 最后一个消费者卸载后释放原生监听；再次挂载会重新读取系统设置。
export function useReduceMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
