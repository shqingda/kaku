import { createContext, type ReactNode, useContext, useCallback } from 'react';
import { parseSearchHistoryResponse } from '@/infrastructure/kaku/search-history-client';
import { useSyncedHistory } from '@/features/history/use-synced-history';
import { loadSearchHistory, saveSearchHistory } from './search-history';
import { addRecentSearch, mergeSearchHistory } from './search-history-model';
import { recordDiagnosticError } from '@/lib/diagnostic-log';

const options = {
  path: '/me/search-history',
  errorMessage: '搜索历史同步失败，请稍后重试。',
  load: loadSearchHistory,
  save: saveSearchHistory,
  parse: parseSearchHistoryResponse,
  merge: mergeSearchHistory,
};

type ContextValue = Omit<ReturnType<typeof useSyncedHistory<string>>, 'updateItems'> & {
  addSearch: (keyword: string) => void;
};
const SearchHistoryContext = createContext<ContextValue | null>(null);

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const { updateItems, ...history } = useSyncedHistory(options);
  const addSearch = useCallback((keyword: string) => {
    void updateItems((items) => addRecentSearch(items, keyword)).catch(() => {
      // Automatic history must not interrupt search. Diagnostics may also fail
      // on a full disk; the explicit clear action still receives the rejection.
      void recordDiagnosticError(new Error('搜索历史未能保存到本机')).catch(() => {});
    });
  }, [updateItems]);
  const value = { ...history, addSearch };
  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  const context = useContext(SearchHistoryContext);
  if (!context) {
    throw new Error('useSearchHistory must be used inside SearchHistoryProvider');
  }
  return context;
}
