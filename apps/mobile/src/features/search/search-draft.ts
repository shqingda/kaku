import { useSyncExternalStore } from 'react';

let searchDraft = '';
const listeners = new Set<() => void>();

export function getSearchDraft() {
  return searchDraft;
}

export function setSearchDraft(value: string) {
  if (searchDraft === value) return;
  searchDraft = value;
  listeners.forEach((listener) => listener());
}

export function subscribeSearchDraft(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSearchDraft() {
  const value = useSyncExternalStore(
    subscribeSearchDraft,
    getSearchDraft,
    getSearchDraft,
  );

  return [value, setSearchDraft] as const;
}
