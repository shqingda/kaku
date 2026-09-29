import { act, cleanup, renderHook } from '@testing-library/react-native';
import { useTopicReadingPosition } from '@/features/discussions/use-topic-reading-position';
import type { ViewToken } from 'react-native';
const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItemSync: (key: string) => mockStore.get(key) ?? null,
  setItemSync: (key: string, value: string) => mockStore.set(key, value),
} }));
const visible = (id: string) => ({ viewableItems: [{ isViewable: true, item: { id } } as ViewToken] });
beforeEach(() => mockStore.clear());
afterEach(cleanup);
test('initial layout does not erase progress; explicit reading restores a stable reply ID across remount', async () => {
  const first = await renderHook(() => useTopicReadingPosition(1, 'subject:10', false));
  await act(() => first.result.current.onViewableItemsChanged(visible('first')));
  expect(mockStore.size).toBe(0);
  await act(() => first.result.current.beginReading());
  await act(() => first.result.current.onViewableItemsChanged(visible('reply-42')));
  await first.unmount();
  const reopened = await renderHook(() => useTopicReadingPosition(1, 'subject:10', false));
  expect(reopened.result.current.savedReply).toBe('reply-42');
  await act(() => reopened.result.current.fromStart());
  expect(reopened.result.current.savedReply).toBeNull();
});
test('accounts and topics are isolated and notification deep links suppress the resume prompt', async () => {
  mockStore.set('kaku:topic-reading:v1:1', JSON.stringify([{ topic: 'group:10', reply: 'saved' }]));
  const other = await renderHook(() => useTopicReadingPosition(2, 'group:10', false));
  expect(other.result.current.savedReply).toBeNull();
  const notification = await renderHook(() => useTopicReadingPosition(1, 'group:10', true));
  expect(notification.result.current.savedReply).toBeNull();
  const subject = await renderHook(() => useTopicReadingPosition(1, 'subject:10', false));
  expect(subject.result.current.savedReply).toBeNull();
});
