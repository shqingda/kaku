import { fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { PagedListFooter } from '@/features/shared/paged-list-footer';

let mockOffline = false;
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => mockOffline }));

const baseProps = {
  hasNextPage: true,
  isError: false,
  isFetching: false,
  loadedCount: 8,
  onRetry: jest.fn(),
};

beforeEach(() => { mockOffline = false; baseProps.onRetry.mockClear(); });
afterEach(() => jest.restoreAllMocks());

it.each([false, true])('shows loading instead of a stale error while retrying (error: %s)', async (isError) => {
  const screen = await render(<PagedListFooter {...baseProps} isError={isError} isFetching />);
  expect(screen.getByText('正在加载更多结果')).toBeTruthy();
  expect(screen.queryByText('后续结果加载失败')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

it.each([
  { hasNextPage: false, total: undefined, text: '已加载全部 8 个结果' },
  { hasNextPage: false, total: 24, text: '已显示全部 8 个结果' },
  { hasNextPage: true, total: undefined, text: '继续上滑加载更多 · 已显示 8 个结果' },
  { hasNextPage: true, total: 24, text: '继续上滑加载更多 · 已显示 8 / 24' },
])('describes the remaining results: $text', async ({ text, ...props }) => {
  const screen = await render(<PagedListFooter {...baseProps} {...props} />);
  expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

it.each([false, true])('exposes a paused request and lets the user retry (offline: %s)', async (offline) => {
  mockOffline = offline;
  const screen = await render(<PagedListFooter {...baseProps} isPaused={!offline} isError />);
  expect(screen.getByText('后续结果等待联网')).toBeTruthy();
  expect(screen.queryByText('后续结果加载失败')).toBeNull();
  expect(screen.queryByText('正在加载更多结果')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(baseProps.onRetry).toHaveBeenCalledTimes(1);
});

it('keeps the completed count when a fully loaded list is offline', async () => {
  mockOffline = true;
  const screen = await render(<PagedListFooter {...baseProps} hasNextPage={false} isPaused />);
  expect(screen.getByText('已加载全部 8 个结果')).toBeTruthy();
  expect(screen.queryByText('后续结果等待联网')).toBeNull();
});

it.each(['ios', 'android'] as const)('announces each visible failure once on %s and preserves retry', async (platform) => {
  jest.replaceProperty(Platform, 'OS', platform);
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  announce.mockClear();
  const screen = await render(<PagedListFooter {...baseProps} />);
  expect(announce).not.toHaveBeenCalled();

  await screen.rerender(<PagedListFooter {...baseProps} isError />);
  expect(screen.root?.props.accessibilityRole).toBe('alert');
  expect(screen.root?.props.accessibilityLiveRegion).toBe('assertive');
  expect(announce).toHaveBeenCalledTimes(platform === 'ios' ? 1 : 0);
  await screen.rerender(<PagedListFooter {...baseProps} isError loadedCount={9} />);
  expect(announce).toHaveBeenCalledTimes(platform === 'ios' ? 1 : 0);
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(baseProps.onRetry).toHaveBeenCalledTimes(1);

  await screen.rerender(<PagedListFooter {...baseProps} isError isFetching />);
  expect(screen.queryByText('后续结果加载失败')).toBeNull();
  await screen.rerender(<PagedListFooter {...baseProps} isError />);
  expect(announce).toHaveBeenCalledTimes(platform === 'ios' ? 2 : 0);
});
