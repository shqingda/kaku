import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { requestBangumiTurnstileToken } from '@/features/auth/bangumi-turnstile';
import { createTimelineSay } from '@/infrastructure/kaku/timeline-client';
import { queryKeys } from '@/lib/query-keys';

export function useCreateTimelineSay() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useAuthMutation({
    mutationFn: async (content: string, request) => {
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
