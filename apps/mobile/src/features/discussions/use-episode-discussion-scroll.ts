import { useCallback, useEffect, useRef } from 'react';
import { Platform, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SPACING } from '@/constants/design';
import { useScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';
import { useEpisodeCommentScrollPosition } from './use-episode-comment-scroll-position';

const ANDROID_SCROLL_DIRECTION_OPTIONS = {
  distanceThreshold: SPACING.xxl + SPACING.md,
  settleMs: 320,
};

type ScrollableList = {
  scrollToOffset: (options: { animated: boolean; offset: number }) => void;
};

export function useEpisodeDiscussionScroll({
  canRestore, episodeId, listRef, scope,
}: {
  canRestore: boolean;
  episodeId: number | undefined;
  listRef: { current: ScrollableList | null };
  scope: string;
}) {
  const scrollPosition = useEpisodeCommentScrollPosition(
    episodeId,
    listRef,
  );
  const {
    action: scrollAction,
    begin: beginScrollAction,
    dismiss: dismissScrollAction,
    end: endScrollAction,
    handleScroll: handleScrollAction,
  } = useScrollDirectionAction(
    Platform.OS === 'android' ? ANDROID_SCROLL_DIRECTION_OPTIONS : undefined,
  );

  const maxScrollOffsetRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const landingFrameRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const cancelScrollLanding = useCallback(() => {
    if (landingFrameRef.current !== null) {
      cancelAnimationFrame(landingFrameRef.current);
      landingFrameRef.current = null;
    }
  }, []);

  // 换集、离开页面时，不能让上一页排队的滚动落到新列表上。
  useEffect(
    () => cancelScrollLanding,
    [scope, cancelScrollLanding],
  );
  useEffect(() => {
    scrollOffsetRef.current = 0;
    maxScrollOffsetRef.current = 0;
    contentHeightRef.current = 0;
    dismissScrollAction();
  }, [episodeId, dismissScrollAction]);
  const handleListScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      scrollOffsetRef.current = contentOffset.y;
      scrollPosition.track(contentOffset.y);
      viewportHeightRef.current = layoutMeasurement.height;
      contentHeightRef.current = contentSize.height;
      maxScrollOffsetRef.current = Math.max(
        0,
        contentSize.height - layoutMeasurement.height,
      );
      handleScrollAction(contentOffset.y, maxScrollOffsetRef.current);
    },
    [handleScrollAction, scrollPosition.track],
  );

  // 远距离只动画最后两屏，避免几百楼挤进一次短促的原生动画。
  // 仍用 offset：这里的评论行高不固定，不依赖末楼的索引测量。
  const jumpToLatest = useCallback(() => {
    cancelScrollLanding();
    dismissScrollAction();
    const list = listRef.current;
    if (!list) return;

    const bottom = maxScrollOffsetRef.current;
    const landingDistance = viewportHeightRef.current * 2;
    if (
      reduceMotion ||
      landingDistance <= 0 ||
      bottom - scrollOffsetRef.current <= landingDistance
    ) {
      list.scrollToOffset({ animated: !reduceMotion, offset: bottom + 200 });
      return;
    }

    list.scrollToOffset({ animated: false, offset: bottom - landingDistance });
    // 先提交定位并让目标附近的单元格布局，再从新位置发起原生滚动。
    // 读取最新底部，吸收这期间可变行高的测量更新。
    landingFrameRef.current = requestAnimationFrame(() => {
      landingFrameRef.current = requestAnimationFrame(() => {
        landingFrameRef.current = null;
        listRef.current?.scrollToOffset({
          animated: true,
          offset: maxScrollOffsetRef.current + 200,
        });
      });
    });
  }, [
    cancelScrollLanding,
    dismissScrollAction,
    reduceMotion,
    listRef,
  ]);

  const scrollToTop = useCallback(() => {
    cancelScrollLanding();
    dismissScrollAction();
    const list = listRef.current;
    if (!list) return;

    const landingDistance = viewportHeightRef.current * 2;
    if (
      reduceMotion ||
      landingDistance <= 0 ||
      scrollOffsetRef.current <= landingDistance
    ) {
      list.scrollToOffset({ animated: !reduceMotion, offset: 0 });
      return;
    }

    list.scrollToOffset({ animated: false, offset: landingDistance });
    landingFrameRef.current = requestAnimationFrame(() => {
      landingFrameRef.current = requestAnimationFrame(() => {
        landingFrameRef.current = null;
        listRef.current?.scrollToOffset({
          animated: true,
          offset: 0,
        });
      });
    });
  }, [
    cancelScrollLanding,
    dismissScrollAction,
    reduceMotion,
    listRef,
  ]);

  return {
    cancelScrollLanding,
    jumpToLatest,
    save: scrollPosition.save,
    scrollAction,
    scrollToTop,
    listProps: {
      onScroll: handleListScroll,
      onMomentumScrollEnd: scrollPosition.save,
      onScrollBeginDrag(event: NativeSyntheticEvent<NativeScrollEvent>) {
        cancelScrollLanding();
        beginScrollAction(event.nativeEvent.contentOffset.y);
      },
      onScrollEndDrag() {
        endScrollAction();
        scrollPosition.save();
      },
      onLayout(event: LayoutChangeEvent) {
        viewportHeightRef.current = event.nativeEvent.layout.height;
        maxScrollOffsetRef.current = Math.max(
          0, contentHeightRef.current - viewportHeightRef.current,
        );
        if (canRestore && contentHeightRef.current > 0) {
          scrollPosition.restore(maxScrollOffsetRef.current);
        }
      },
      onContentSizeChange(_width: number, height: number) {
        contentHeightRef.current = height;
        maxScrollOffsetRef.current = Math.max(
          0, height - viewportHeightRef.current,
        );
        if (canRestore && viewportHeightRef.current > 0) {
          scrollPosition.restore(maxScrollOffsetRef.current);
        }
      },
    },
  };
}
