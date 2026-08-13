import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import { deleteTimeline } from '@/infrastructure/kaku/timeline-client';
import { queryKeys } from '@/lib/query-keys';

// 删除自己时间线里的一条动态，成功后刷新公开时间线与好友动态。
export function useDeleteTimeline(username: string) {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timelineId: number) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return deleteTimeline(request, timelineId, turnstileToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.publicUserTimeline(username),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.friendTimeline(session?.user.id),
      });
    },
  });
}
