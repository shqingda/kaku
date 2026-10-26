import { Platform } from 'react-native';

import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import type { ScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';

import { EpisodeScrollActionButton } from './episode-scroll-action-button';

// Android 合并为一个随方向切换的按钮；iOS 用两个独立的浮动按钮淡入淡出。
export function EpisodeScrollButtons({
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
  if (Platform.OS === 'android') {
    return (
      <EpisodeScrollActionButton action={action} bottom={bottom} onBottom={onBottom} onTop={onTop} />
    );
  }

  return (
    <>
      <ScrollToTopButton
        accessibilityHint="滚动到本集评论顶部"
        accessibilityLabel="回到顶部"
        bottom={bottom}
        onPress={onTop}
        visible={action === 'top'}
      />
      <ScrollToTopButton
        accessibilityHint="滚动到本集最新一条回复"
        accessibilityLabel="跳到最新回复"
        bottom={bottom}
        icon={{
          android: 'arrow_downward',
          ios: 'arrow.down',
          web: 'arrow_downward',
        }}
        onPress={onBottom}
        visible={action === 'bottom'}
      />
    </>
  );
}
