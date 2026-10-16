import { useAuthMutation } from '@/features/auth/use-auth-mutation';

import {
  createReport,
  type ReportInput,
} from '@/infrastructure/kaku/reports-client';

export function useCreateReport() {

  return useAuthMutation({
    mutationFn: (input: ReportInput, request) => createReport(request, input),
  });
}
