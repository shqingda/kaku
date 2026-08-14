import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthActions } from '@/features/auth/auth-provider';
import {
  createIndex,
  deleteIndex,
  updateIndex,
} from '@/infrastructure/kaku/indexes-client';
import { queryKeys } from '@/lib/query-keys';

type IndexInput = { desc: string; isPrivate?: boolean; title: string };

export function useCreateIndex() {
  const { request } = useAuthActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IndexInput) => createIndex(request, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}

export function useUpdateIndex(indexId: number) {
  const { request } = useAuthActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IndexInput) => updateIndex(request, indexId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.publicIndex(indexId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}

export function useDeleteIndex() {
  const { request } = useAuthActions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (indexId: number) => deleteIndex(request, indexId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['indexes', 'kaku'],
      });
    },
  });
}
