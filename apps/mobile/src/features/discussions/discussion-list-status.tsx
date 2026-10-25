import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { SkeletonList } from '@/features/shared/skeleton-list';
import { DiscussionStatus } from './discussion-status';

// Topic lists keep their rows during refresh; only an empty first load needs a skeleton.
export function DiscussionListStatus({
  errorText,
  hasItems,
  isError,
  isPaused,
  isPending,
  loadingText = '正在读取 Bangumi 讨论…',
  onRetry,
  rowHeight = 90,
}: {
  errorText?: string;
  hasItems: boolean;
  isError: boolean;
  isPaused: boolean;
  isPending: boolean;
  loadingText?: string;
  onRetry: () => void;
  rowHeight?: number;
}) {
  if (hasItems) {
    return isError || isPaused ? <CachedDataNotice onRetry={onRetry} /> : null;
  }
  if (isError || isPaused) {
    return (
      <DiscussionStatus
        errorText={isPaused ? '网络暂不可用，恢复连接后可重试讨论。' : errorText}
        isError
        isPending={false}
        onRetry={onRetry}
      />
    );
  }
  return isPending ? (
    <SkeletonList accessibilityLabel={loadingText} count={4} rowHeight={rowHeight} />
  ) : null;
}
