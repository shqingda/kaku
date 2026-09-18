import { createContext, type ReactNode, useContext, useCallback } from 'react';
import { parseRecentSubjectsResponse } from '@/infrastructure/kaku/recent-subjects-client';
import { useSyncedHistory } from '@/features/history/use-synced-history';
import { loadRecentSubjects, saveRecentSubjects } from './recent-subjects';
import { addRecentSubject, mergeRecentSubjects, type RecentSubject } from './recent-subjects-model';

const options = {
  path: '/me/recent-subjects',
  errorMessage: '最近浏览同步失败，请稍后重试。',
  load: loadRecentSubjects,
  save: saveRecentSubjects,
  parse: parseRecentSubjectsResponse,
  merge: mergeRecentSubjects,
};

type ContextValue = Omit<ReturnType<typeof useSyncedHistory<RecentSubject>>, 'updateItems'> & {
  rememberSubject: (subject: RecentSubject) => void;
};
const RecentSubjectsContext = createContext<ContextValue | null>(null);

export function RecentSubjectsProvider({ children }: { children: ReactNode }) {
  const { updateItems, ...history } = useSyncedHistory(options);
  const rememberSubject = useCallback((subject: RecentSubject) => {
    void updateItems((items) => addRecentSubject(items, subject));
  }, [updateItems]);
  const value = { ...history, rememberSubject };
  return (
    <RecentSubjectsContext.Provider value={value}>
      {children}
    </RecentSubjectsContext.Provider>
  );
}

export function useRecentSubjects() {
  const context = useContext(RecentSubjectsContext);
  if (!context) {
    throw new Error('useRecentSubjects must be used inside RecentSubjectsProvider');
  }
  return context;
}
