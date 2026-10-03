import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { RecentSearches } from '@/features/search/recent-searches';
import { RecentSubjectsSection } from '@/features/history/recent-subjects-section';
import { ThemeProvider } from '@/features/theme/theme-provider';
import type { HistoryLocalFeedback } from '@/features/history/history-local-notice';

jest.mock('expo-router', () => ({ Link: Object.assign(({ children }: any) => children, { AppleZoom: ({ children }: any) => children }) }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({ usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }) }));
const retrySearch = jest.fn();
const retryBrowse = jest.fn();
const clear = jest.fn();
const select = jest.fn();
function Page({ status = 'read-error', busy = false }: { status?: HistoryLocalFeedback['localStatus']; busy?: boolean }) {
  const history = { localStatus: status, localError: '历史暂时无法读取，新记录暂存在当前窗口', isClearing: busy };
  return <ThemeProvider>
    <RecentSearches items={[]} history={{ ...history, retryLocalHistory: retrySearch }} onClear={clear} onSelect={select} />
    <RecentSubjectsSection items={[]} history={{ ...history, retryLocalHistory: retryBrowse }} onClear={clear} />
  </ThemeProvider>;
}
beforeEach(() => { retrySearch.mockReset().mockResolvedValue(false); retryBrowse.mockReset().mockResolvedValue(false); clear.mockClear(); });
afterEach(async () => { await cleanup(); });

test('empty unreadable histories retain both sections and retry only the selected kind', async () => {
  await render(<Page />);
  expect(screen.getByText('最近搜索')).toBeTruthy();
  expect(screen.getByText('最近浏览')).toBeTruthy();
  expect(screen.getByLabelText('清除最近搜索')).toBeDisabled();
  expect(screen.getByLabelText('清除最近浏览')).toBeDisabled();
  await fireEvent.press(screen.getByLabelText('清除最近搜索'));
  expect(clear).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('重试读取搜索历史'));
  expect(retrySearch).toHaveBeenCalledTimes(1);
  expect(retryBrowse).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('重试读取浏览历史'));
  expect(retryBrowse).toHaveBeenCalledTimes(1);
});

test('loading is explicit and a successful empty history hides the sections', async () => {
  const view = await render(<Page status="loading" />);
  expect(screen.getByLabelText('正在读取搜索历史')).toBeTruthy();
  expect(screen.getByLabelText('正在读取浏览历史')).toBeTruthy();
  await view.rerender(<Page status="ready" />);
  expect(screen.queryByText('最近搜索')).toBeNull();
  expect(screen.queryByText('最近浏览')).toBeNull();
});

test('save retry is busy until finished and existing items remain usable', async () => {
  let resolve!: (value: boolean) => void;
  retrySearch.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const history: HistoryLocalFeedback = { localStatus: 'write-error', localError: '历史未能保存', isClearing: false, retryLocalHistory: retrySearch };
  const view = await render(<ThemeProvider><RecentSearches items={['stored']} history={history} onClear={clear} onSelect={select} /></ThemeProvider>);
  await fireEvent.press(screen.getByLabelText('搜索stored'));
  expect(select).toHaveBeenCalledWith('stored');
  await fireEvent.press(screen.getByLabelText('重试保存搜索历史'));
  expect(screen.getByLabelText('重试保存搜索历史')).toBeDisabled();
  await fireEvent.press(screen.getByLabelText('重试保存搜索历史'));
  expect(retrySearch).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(false); });
  expect(screen.getByLabelText('重试保存搜索历史')).not.toBeDisabled();
  await view.rerender(<ThemeProvider><RecentSearches items={['stored']} history={{ ...history, isClearing: true }} onClear={clear} onSelect={select} /></ThemeProvider>);
  expect(screen.getByLabelText('清除最近搜索')).toBeDisabled();
  expect(screen.getByLabelText('搜索stored')).toBeTruthy();
});
