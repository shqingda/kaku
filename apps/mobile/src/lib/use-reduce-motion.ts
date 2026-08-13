import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// 减少动态效果：所有可感知的运动组件都应读取该开关。
// 开启时不使用位移/弹簧，改用短促的不透明度过渡，避免前庭刺激。
export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
