import { useAuthMutation } from '@/features/auth/use-auth-mutation';
import { useQueryClient } from '@tanstack/react-query';

import {
  createIndex,
  deleteIndex,
  updateIndex,
} from '@/infrastructure/kaku/indexes-client';
import { queryKeys } from '@/lib/query-keys';

type IndexInput = { desc: string; isPrivate?: boolean; title: string };

export function useCreateIndex() {
  const queryClient = useQueryClient();

  return useAuthMutation({
    mutationFn: (input: IndexInput, request) => createIndex(request, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}

export function useUpdateIndex(indexId: number) {
  const queryClient = useQueryClient();

  return useAuthMutation({
    mutationFn: (input: IndexInput & { expected: { desc: string; isPrivate: boolean; title: string } }, request) => updateIndex(request, indexId, input),
    onSuccess: async (_data, _input, _context, scope) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.publicIndex(indexId),
      });
      if (!scope.isCurrent()) return;
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}

export function useDeleteIndex() {
  const queryClient = useQueryClient();

  return useAuthMutation({
    mutationFn: (indexId: number, request) => deleteIndex(request, indexId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}
