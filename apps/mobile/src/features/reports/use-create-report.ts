import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import {
  createReport,
  type ReportInput,
} from '@/infrastructure/kaku/reports-client';

export function useCreateReport() {
  const { request } = useAuth();

  return useMutation({
    mutationFn: (input: ReportInput) => createReport(request, input),
  });
}
