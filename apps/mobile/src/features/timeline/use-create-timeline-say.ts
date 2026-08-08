import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import { createTimelineSay } from '@/infrastructure/kaku/timeline-client';
import { queryKeys } from '@/lib/query-keys';

export function useCreateTimelineSay() {
  const { request, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const turnstileToken = await requestBangumiTurnstileToken();
      return createTimelineSay(request, content, turnstileToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.friendTimeline(session?.user.id),
      });
    },
  });
}
