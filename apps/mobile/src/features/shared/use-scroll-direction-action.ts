import { useCallback, useEffect, useRef, useState } from 'react';

export type ScrollDirectionAction = 'bottom' | 'top';

// 先越过微小位移，再保持同一方向一小段时间，避免手指回弹让按钮来回闪。
const DIRECTION_DISTANCE_THRESHOLD = 24;
const DIRECTION_SETTLE_MS = 180;
const EDGE_EPSILON = 1;

export function useScrollDirectionAction() {
  const [action, setAction] = useState<ScrollDirectionAction | null>(null);
  const actionRef = useRef<ScrollDirectionAction | null>(null);
  const candidateRef = useRef<ScrollDirectionAction | null>(null);
  const candidateDistanceRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const trackingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
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
    show(null);
  }, [clearSettleTimer, show]);

  const begin = useCallback(
    (offset: number) => {
      trackingRef.current = true;
      lastOffsetRef.current = offset;
      candidateRef.current = null;
      candidateDistanceRef.current = 0;
      clearSettleTimer();
    },
    [clearSettleTimer],
  );

  const end = useCallback(() => {
    trackingRef.current = false;
  }, []);

  const handleScroll = useCallback(
    (offset: number, maxOffset: number) => {
      const atEdge =
        maxOffset <= 0 ||
        offset <= EDGE_EPSILON ||
        offset >= maxOffset - EDGE_EPSILON;
      if (atEdge) {
        if (trackingRef.current) lastOffsetRef.current = offset;
        candidateRef.current = null;
        candidateDistanceRef.current = 0;
        clearSettleTimer();
        show(null);
        return;
      }
      if (!trackingRef.current) return;

      const delta = offset - lastOffsetRef.current;
      lastOffsetRef.current = offset;
      if (delta === 0) return;

      // 列表向下浏览时 offset 增大，提供回顶；向上浏览时提供到底部。
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
    },
    [clearSettleTimer, show],
  );

  useEffect(
    () => () => {
      trackingRef.current = false;
      clearSettleTimer();
    },
    [clearSettleTimer],
  );

  return { action, begin, dismiss, end, handleScroll };
}
