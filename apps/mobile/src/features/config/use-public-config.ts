import { useQuery } from '@tanstack/react-query';

import { getPublicConfig } from '@/infrastructure/kaku/config-client';

export function usePublicConfig() {
  return useQuery({
    meta: { persist: true, visibility: 'public' },
    queryFn: ({ signal }) => getPublicConfig(signal),
    queryKey: ['kaku-public-config'],
    staleTime: 5 * 60 * 1000,
  });
}
