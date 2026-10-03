import { useState } from 'react';
import { Alert, Button } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import { ThemeProvider } from '@/features/theme/theme-provider';
const timelineDraftKey = (id: number) => `kaku:timeline-draft:v1:${id}`;

const mockStorage = new Map<string, string>();
const mockRequest = jest.fn();
let mockUserId = 1;
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItemSync: (key: string) => mockStorage.get(key) ?? null,
  setItemSync: (key: string, value: string) => mockStorage.set(key, value),
  removeItemSync: (key: string) => mockStorage.delete(key),
} }));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ request: mockRequest, session: { user: { id: mockUserId } } }),
  useAuthActions: () => ({ request: mockRequest }),
}));
jest.mock('@/features/auth/bangumi-turnstile', () => ({ requestBangumiTurnstileToken: async () => 'test-token' }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/emoji-picker/bangumi-emoji-picker', () => ({ BangumiRichTextToolbar: () => null }));
jest.mock('@/features/shared/app-sheet', () => {
  const { View } = require('react-native');
  return { AppSheet: ({ visible, header, children }: { visible: boolean; header: React.ReactNode; children: React.ReactNode }) => visible ? <View>{header}{children}</View> : null };
});
const key = timelineDraftKey(1);
let client: QueryClient;
function Page() {
  const [visible, setVisible] = useState(true);
  return <QueryClientProvider client={client}><ThemeProvider>
    <Button title="重新打开" onPress={() => setVisible(true)} />
    <TimelineComposer visible={visible} onClose={() => setVisible(false)} />
  </ThemeProvider></QueryClientProvider>;
}
beforeEach(() => {
  mockUserId = 1; mockStorage.clear(); mockRequest.mockReset();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity }, queries: { gcTime: Infinity, retry: false } } });
});
afterEach(async () => { await cleanup(); client.clear(); });

test('close/reopen and full remount retain the latest draft', async () => {
  const first = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '继续写的草稿');
  await fireEvent.press(screen.getByLabelText('关闭'));
  expect(screen.queryByLabelText('动态内容')).toBeNull();
  await fireEvent.press(screen.getByText('重新打开'));
  expect(screen.getByLabelText('动态内容').props.value).toBe('继续写的草稿');
  await first.unmount();
  await render(<Page />);
  expect(screen.getByLabelText('动态内容').props.value).toBe('继续写的草稿');
  expect(mockRequest).not.toHaveBeenCalled();
});

test('failed send retains text across reopening; successful retry deletes only its draft', async () => {
  mockRequest.mockResolvedValueOnce(new Response(JSON.stringify({ message: '发送失败' }), { status: 400 }));
  await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '待发送内容');
  await fireEvent.press(screen.getByLabelText('发布动态'));
  await screen.findByText('暂时没有成功，请稍后重试。');
  expect(mockStorage.get(key)).toBe('待发送内容');
  await fireEvent.press(screen.getByLabelText('关闭'));
  await fireEvent.press(screen.getByText('重新打开'));
  expect(screen.getByLabelText('动态内容').props.value).toBe('待发送内容');
  mockStorage.set(timelineDraftKey(2), '另一个账号的草稿');
  mockRequest.mockResolvedValueOnce(new Response(JSON.stringify({ id: 123 })));
  await fireEvent.press(screen.getByLabelText('发布动态'));
  await waitFor(() => expect(screen.queryByLabelText('动态内容')).toBeNull());
  expect(mockStorage.has(key)).toBe(false);
  expect(mockStorage.get(timelineDraftKey(2))).toBe('另一个账号的草稿');
  expect(mockRequest).toHaveBeenLastCalledWith('/me/timeline', expect.objectContaining({ method: 'POST', body: expect.stringContaining('待发送内容') }));
});

test('switching accounts never shows or overwrites the other account draft', async () => {
  const view = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '账号一');
  mockUserId = 2;
  await view.rerender(<Page />);
  expect(screen.getByLabelText('动态内容').props.value).toBe('');
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '账号二');
  mockUserId = 1;
  await view.rerender(<Page />);
  expect(screen.getByLabelText('动态内容').props.value).toBe('账号一');
});

test('a late send completion does not erase the current account draft or close its composer', async () => {
  let resolve!: (value: Response) => void;
  mockRequest.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
  const view = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '账号一发送中');
  await fireEvent.press(screen.getByLabelText('发布动态'));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  mockUserId = 2;
  await view.rerender(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '账号二正在写');
  await act(async () => { resolve(new Response(JSON.stringify({ id: 123 }))); });
  await waitFor(() => expect(mockStorage.has(key)).toBe(false));
  expect(screen.getByLabelText('动态内容').props.value).toBe('账号二正在写');
});

test('a late send preserves a newly edited identical draft after returning to the same account', async () => {
  let resolve!: (value: Response) => void;
  mockRequest.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
  const view = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '同样的内容');
  await fireEvent.press(screen.getByLabelText('发布动态'));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  mockUserId = 2;
  await view.rerender(<Page />);
  mockUserId = 1;
  await view.rerender(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '重新编辑');
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '同样的内容');
  await act(async () => { resolve(new Response(JSON.stringify({ id: 123 }))); });
  expect(mockStorage.get(key)).toBe('同样的内容');
  expect(screen.getByLabelText('动态内容').props.value).toBe('同样的内容');
});

test('discard confirmation becomes invalid after closing and reopening the composer', async () => {
  const alerts = jest.spyOn(Alert, 'alert');
  await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('动态内容'), '保留草稿');
  await fireEvent.press(screen.getByText('丢弃草稿'));
  const discard = alerts.mock.calls.at(-1)![2]![1].onPress!;
  await fireEvent.press(screen.getByLabelText('关闭'));
  await fireEvent.press(screen.getByText('重新打开'));
  await act(() => { discard(); });
  expect(mockStorage.get(key)).toBe('保留草稿');
  expect(screen.getByLabelText('动态内容').props.value).toBe('保留草稿');
  await fireEvent.press(screen.getByText('丢弃草稿'));
  await act(() => { alerts.mock.calls.at(-1)![2]![1].onPress!(); });
  expect(mockStorage.has(key)).toBe(false);
  expect(screen.queryByLabelText('动态内容')).toBeNull();
  alerts.mockRestore();
});

test.each(['使用本机草稿', '保存当前内容'])('two editors resolve a save conflict through the retry action: %s', async (choice) => {
  const alerts = jest.spyOn(Alert, 'alert');
  const closeFirst = jest.fn();
  const closeSecond = jest.fn();
  await render(<QueryClientProvider client={client}><ThemeProvider>
    <TimelineComposer visible onClose={closeFirst} />
    <TimelineComposer visible onClose={closeSecond} />
  </ThemeProvider></QueryClientProvider>);
  await fireEvent.changeText(screen.getAllByLabelText('动态内容')[0], '第一页已保存');
  await fireEvent.changeText(screen.getAllByLabelText('动态内容')[1], '第二页的输入');
  expect(mockStorage.get(key)).toBe('第一页已保存');
  expect(screen.getAllByLabelText('动态内容')[1].props.value).toBe('第二页的输入');
  expect(screen.getByText(/草稿已在另一窗口更新/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(/重试动态草稿：草稿已在另一窗口更新/));
  expect(alerts.mock.calls.at(-1)![0]).toBe('选择要保留的草稿');
  await act(() => { alerts.mock.calls.at(-1)![2]!.find(button => button.text === choice)!.onPress!(); });
  const expected = choice === '使用本机草稿' ? '第一页已保存' : '第二页的输入';
  expect(mockStorage.get(key)).toBe(expected);
  expect(screen.getAllByLabelText('动态内容')[1].props.value).toBe(expected);
  expect(screen.queryByText(/草稿已在另一窗口更新/)).toBeNull();
  await fireEvent.press(screen.getAllByLabelText('关闭')[0]);
  expect(closeFirst).toHaveBeenCalledTimes(1);
  expect(closeSecond).not.toHaveBeenCalled();
  expect(mockStorage.get(key)).toBe(expected);
  expect(mockRequest).not.toHaveBeenCalled();
  alerts.mockRestore();
});
