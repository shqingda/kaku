import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import type { ScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';

const DOWN_ICON = {
  android: 'arrow_downward',
  ios: 'arrow.down',
  web: 'arrow_downward',
} as const;

// Android 的两个悬浮按钮带 elevation；只保留一个实体，收起后再换图标，
// 避免交叉淡入时两个阴影叠在一起。反向手势能打断收起动画并从当前值恢复。
export function EpisodeScrollActionButton({
  action,
  bottom,
  onBottom,
  onTop,
}: {
  action: ScrollDirectionAction | null;
  bottom: number;
  onBottom: () => void;
  onTop: () => void;
}) {
  const [renderedAction, setRenderedAction] = useState(action);
  const [visible, setVisible] = useState(false);
  const latestActionRef = useRef(action);

  useLayoutEffect(() => {
    latestActionRef.current = action;
  }, [action]);

  useEffect(() => {
    if (!action) {
      setVisible(false);
    } else if (!renderedAction) {
      setRenderedAction(action);
    } else {
      setVisible(action === renderedAction);
    }
  }, [action, renderedAction]);

  const handleHidden = useCallback(() => {
    setRenderedAction(latestActionRef.current);
  }, []);

  if (!renderedAction) return null;

  const isTop = renderedAction === 'top';
  return (
    <ScrollToTopButton
      accessibilityHint={isTop ? '滚动到本集评论顶部' : '滚动到本集最新一条回复'}
      accessibilityLabel={isTop ? '回到顶部' : '跳到最新回复'}
      bottom={bottom}
      icon={isTop ? undefined : DOWN_ICON}
      onHidden={handleHidden}
      onPress={isTop ? onTop : onBottom}
      visible={visible}
    />
  );
}
