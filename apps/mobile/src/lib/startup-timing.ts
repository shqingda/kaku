// 轻量首屏计时：记录 JS 启动到首页首次渲染的耗时，供诊断页查看。
// 不引入额外依赖，后续可接 Sentry 或自建指标上报。
export const appStartTime = globalThis.performance?.now?.() ?? Date.now();

let firstContentTime: number | undefined;

export function markFirstContent() {
  if (firstContentTime === undefined) {
    firstContentTime = globalThis.performance?.now?.() ?? Date.now();
  }
}

export function getFirstContentDelayMs() {
  return firstContentTime === undefined
    ? undefined
    : Math.round(firstContentTime - appStartTime);
}
