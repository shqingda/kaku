import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { createIndex } from '@/infrastructure/kaku/indexes-client';

export function useCreateIndex() {
  const { request } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      desc: string;
      isPrivate?: boolean;
      title: string;
    }) => createIndex(request, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}
