// 纯运动数学：底部弹层（AppSheet）的拖拽、橡皮筋与动量投影。
// 与 React Native 无关，可被 node:test 直接单测。

// 弹簧参数（映射 Apple damping ratio + response，见 apple-design 清单）：
// - 进入/退出：临界阻尼（damping ratio ≈ 1.0），不产生回弹。
// - 拖拽释放弹回：ratio ≈ 0.8，只有"手势本身带了动量"时才允许轻微回弹。
// reanimated 的 withSpring 使用 damping/stiffness/mass；已知
// ratio = damping / (2 * sqrt(stiffness * mass))，因此：
export const SHEET_ENTER_SPRING = { damping: 35, mass: 1, stiffness: 300 } as const;
export const SHEET_DISMISS_SPRING = { damping: 28, mass: 1, stiffness: 300 } as const;

// 拖拽释放后，甩动速度（px/s）超过该值，即使位移不大也直接关闭。
export const MIN_DISMISS_VELOCITY = 1100;
// 静止释放时，位移超过弹层高度的该比例就关闭。
export const DISMISS_HEIGHT_RATIO = 0.35;
// 橡皮筋阻力系数：越往边界外拉，跟随比例越小。
export const RUBBERBAND_CONSTANT = 0.55;
// 与滚动减速一致的指数衰减率（Apple 样本值 0.998）。
export const DECELERATION_RATE = 0.998;

// Apple 的动量投影：v/1000 · d/(1-d)，把释放速度换算成最终还会滑行的距离。
export function project(velocity: number, decelerationRate = DECELERATION_RATE): number {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// 橡皮筋：越拖过边界，元素跟随得越少，形成"软边界"而不是硬停。
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = RUBBERBAND_CONSTANT,
): number {
  'worklet';
  const denominator = dimension + constant * Math.abs(overshoot);
  return denominator === 0 ? 0 : (overshoot * dimension * constant) / denominator;
}

// 拖拽释放时的关闭判定：先做动量投影，再与位置阈值比较；
// 速度足够大时也直接关闭（快速甩动等同于用户明确要关闭）。
export function shouldDismissSheet(
  translateY: number,
  velocity: number,
  dismissDistance: number,
): boolean {
  'worklet';
  if (dismissDistance <= 0) {
    return translateY > 0;
  }
  const projected = translateY + project(Math.max(velocity, 0));
  return projected > dismissDistance || velocity > MIN_DISMISS_VELOCITY;
}

// 图片预览缩放的边界：与 iOS 照片查看器一致，1x 到 4x。
export const MIN_IMAGE_SCALE = 1;
export const MAX_IMAGE_SCALE = 4;

// 缩放时越过边界的渐进抵抗：超出 4x 或低于 1x 的部分按橡皮筋衰减，
// 而不是硬停，保持"还有内容但阻力越来越大"的手感。
export function resistedScale(rawScale: number): number {
  'worklet';
  if (rawScale > MAX_IMAGE_SCALE) {
    return (
      MAX_IMAGE_SCALE +
      rubberband(rawScale - MAX_IMAGE_SCALE, 1, RUBBERBAND_CONSTANT)
    );
  }
  if (rawScale < MIN_IMAGE_SCALE) {
    return (
      MIN_IMAGE_SCALE -
      rubberband(MIN_IMAGE_SCALE - rawScale, 1, RUBBERBAND_CONSTANT)
    );
  }
  return rawScale;
}

// 松手后缩放回落到最近的有效边界。
export function settleScale(rawScale: number): number {
  'worklet';
  return Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, rawScale));
}

// 缩放后平移的约束：图像不能露出空白。contentSize 是缩放前的布局尺寸，
// viewportSize 是容器尺寸；缩放后的可移动范围为 (contentSize*scale-viewportSize)/2。
export function containedTranslation(
  offset: number,
  contentSize: number,
  viewportSize: number,
  scale: number,
): number {
  'worklet';
  const maxOffset = Math.max(0, (contentSize * scale - viewportSize) / 2);
  return Math.min(maxOffset, Math.max(-maxOffset, offset));
}
