// JS module origin, not native process launch. Device profiling measures the latter.
type HomeState = 'content' | 'empty' | 'error' | 'guest';
type StartupSnapshot = {
  firstLayoutMs?: number;
  cacheRestoredMs?: number;
  homeReadyMs?: number;
  homeState?: HomeState;
};

export function createStartupTiming(now = () => globalThis.performance?.now?.() ?? Date.now()) {
  const origin = now();
  const timings: StartupSnapshot = {};
  const elapsed = () => Math.round(now() - origin);
  return {
    markFirstLayout() { timings.firstLayoutMs ??= elapsed(); },
    markCacheRestored() { timings.cacheRestoredMs ??= elapsed(); },
    markHomeReady(state: HomeState) {
      if (timings.homeReadyMs !== undefined) return;
      timings.homeReadyMs = elapsed();
      timings.homeState = state;
    },
    snapshot: (): StartupSnapshot => ({ ...timings }),
  };
}

export const startupTiming = createStartupTiming();
