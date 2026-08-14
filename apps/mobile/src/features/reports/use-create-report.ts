import { useMutation } from '@tanstack/react-query';

import { useAuthActions } from '@/features/auth/auth-provider';
import {
  createReport,
  type ReportInput,
} from '@/infrastructure/kaku/reports-client';

export function useCreateReport() {
  const { request } = useAuthActions();

  return useMutation({
    mutationFn: (input: ReportInput) => createReport(request, input),
  });
}
