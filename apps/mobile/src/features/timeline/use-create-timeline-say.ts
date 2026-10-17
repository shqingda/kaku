import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { createTimelineSay } from '@/infrastructure/kaku/timeline-client';
import { queryKeys } from '@/lib/query-keys';

export function useCreateTimelineSay(requestVerificationToken: () => Promise<string>) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useAuthMutation({
    // A one-use verification must not silently queue or replay a publication.
    networkMode: 'always',
    retry: false,
    mutationFn: async (content: string, request) => {
      const turnstileToken = await requestVerificationToken();
      return createTimelineSay(request, content, turnstileToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.friendTimeline(session?.user.id),
      });
    },
  });
}
