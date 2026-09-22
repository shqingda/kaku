import { useCallback, useEffect, useRef, useState } from 'react';

export type ScrollDirectionAction = 'bottom' | 'top';

// 先越过微小位移，再保持同一方向一小段时间，避免手指回弹让按钮来回闪。
const DIRECTION_DISTANCE_THRESHOLD = 24;
const DIRECTION_SETTLE_MS = 180;
const IDLE_HIDE_MS = 720;

export function useScrollDirectionAction() {
  const [action, setAction] = useState<ScrollDirectionAction | null>(null);
  const actionRef = useRef<ScrollDirectionAction | null>(null);
  const candidateRef = useRef<ScrollDirectionAction | null>(null);
  const candidateDistanceRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const trackingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const show = useCallback((next: ScrollDirectionAction | null) => {
    if (actionRef.current === next) return;
    actionRef.current = next;
    setAction(next);
  }, []);

  const dismiss = useCallback(() => {
    trackingRef.current = false;
    candidateRef.current = null;
    candidateDistanceRef.current = 0;
    clearSettleTimer();
    clearIdleTimer();
    show(null);
  }, [clearIdleTimer, clearSettleTimer, show]);

  const begin = useCallback(
    (offset: number) => {
      trackingRef.current = true;
      lastOffsetRef.current = offset;
      candidateRef.current = null;
      candidateDistanceRef.current = 0;
      clearSettleTimer();
      clearIdleTimer();
      show(null);
    },
    [clearIdleTimer, clearSettleTimer, show],
  );

  const end = useCallback(() => {
    trackingRef.current = false;
  }, []);

  const handleScroll = useCallback(
    (offset: number) => {
      if (!trackingRef.current) return;

      const delta = offset - lastOffsetRef.current;
      lastOffsetRef.current = offset;
      if (delta === 0) return;

      // 手指向上时 contentOffset 增大，提供回顶；手指向下时提供到底部。
      const next: ScrollDirectionAction = delta > 0 ? 'top' : 'bottom';
      if (candidateRef.current !== next) {
        candidateRef.current = next;
        candidateDistanceRef.current = Math.abs(delta);
        clearSettleTimer();
      } else {
        candidateDistanceRef.current += Math.abs(delta);
      }

      if (
        candidateDistanceRef.current >= DIRECTION_DISTANCE_THRESHOLD &&
        !settleTimerRef.current
      ) {
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          if (candidateRef.current === next) show(next);
        }, DIRECTION_SETTLE_MS);
      }

      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        show(null);
      }, IDLE_HIDE_MS);
    },
    [clearIdleTimer, clearSettleTimer, show],
  );

  useEffect(
    () => () => {
      trackingRef.current = false;
      clearSettleTimer();
      clearIdleTimer();
    },
    [clearIdleTimer, clearSettleTimer],
  );

  return { action, begin, dismiss, end, handleScroll };
}
