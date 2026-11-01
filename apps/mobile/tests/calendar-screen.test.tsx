import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import CalendarScreen from '@/app/calendar';
import type { CalendarDay } from '@/features/discover/model';

const mockRetry = jest.fn();
const mockPrefetch = jest.fn();
const mockCancelPrefetch = jest.fn();
let mockQuery = makeQuery();

function makeQuery() {
  return {
    data: undefined as CalendarDay[] | undefined,
    fetchStatus: 'fetching', isPending: true, isError: false, isRefetching: false,
    refetch: mockRetry,
  };
}

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Stack: { Screen: () => null } }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/discover/use-discover', () => ({ useBangumiCalendar: () => mockQuery }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({
  usePrefetchSubject: () => ({ prefetch: mockPrefetch, cancel: mockCancelPrefetch }),
}));

beforeEach(() => {
  mockRetry.mockClear(); mockPrefetch.mockClear(); mockCancelPrefetch.mockClear();
  jest.mocked(router.push).mockClear();
  mockQuery = makeQuery();
});

test('calendar initial reads distinguish loading, offline pause, failure and empty success', async () => {
  const screen = await render(<CalendarScreen />);
  expect(screen.getByText('正在读取本周放送安排。')).toBeTruthy();

  mockQuery.fetchStatus = 'paused';
  await screen.rerender(<CalendarScreen />);
  expect(screen.getByText('当前离线，恢复连接后可继续读取放送安排。')).toBeTruthy();
  expect(screen.queryByText('正在读取本周放送安排。')).toBeNull();
  expect(screen.queryByText('这一天暂时没有放送条目。')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);

  mockQuery.fetchStatus = 'fetching';
  await screen.rerender(<CalendarScreen />);
  expect(screen.getByText('正在读取本周放送安排。')).toBeTruthy();

  Object.assign(mockQuery, { fetchStatus: 'idle', isPending: false, isError: true });
  await screen.rerender(<CalendarScreen />);
  expect(screen.getByText('Bangumi 暂时没有响应，请稍后重试。')).toBeTruthy();
  expect(screen.queryByText('这一天暂时没有放送条目。')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRetry).toHaveBeenCalledTimes(2);

  Object.assign(mockQuery, { isError: false, data: [] });
  await screen.rerender(<CalendarScreen />);
  expect(screen.getByText('这一天暂时没有放送条目。')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
});

test('cached calendar days remain selectable and openable after a paused or failed refresh', async () => {
  Object.assign(mockQuery, {
    data: [
      { id: 1, label: '星期一', subjects: [{ id: 11, title: '周一条目', type: 2 }] },
      { id: 2, label: '星期二', subjects: [{ id: 22, title: '周二条目', type: 2 }] },
    ],
    isPending: false, isRefetching: true,
  });
  const screen = await render(<CalendarScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '星期二' }));
  expect(screen.getByText('周二条目')).toBeTruthy();

  mockQuery.fetchStatus = 'paused'; mockQuery.isRefetching = false;
  await screen.rerender(<CalendarScreen />);
  expect(screen.getByText('周二条目')).toBeTruthy();
  expect(screen.getByRole('button', { name: '星期二' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);

  mockQuery.fetchStatus = 'idle'; mockQuery.isError = true;
  await screen.rerender(<CalendarScreen />);
  expect(screen.getByText('周二条目')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '星期一' }));
  expect(screen.getByText('周一条目')).toBeTruthy();
  expect(screen.queryByText('周二条目')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(mockRetry).toHaveBeenCalledTimes(2);

  const subject = screen.getByText('周一条目');
  await fireEvent(subject, 'pressIn');
  await fireEvent(subject, 'pressOut');
  await fireEvent.press(subject);
  expect(mockPrefetch).toHaveBeenCalledWith(11);
  expect(mockCancelPrefetch).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith({ pathname: '/subject/[id]', params: { id: '11' } });
});
