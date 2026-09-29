import { useState } from 'react';
import { Button } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IndexComposer } from '@/features/indexes/index-composer';
import { ThemeProvider } from '@/features/theme/theme-provider';
const indexDraftKey = (id: number) => `kaku:index-draft:v1:${id}:new`;

const mockStorage = new Map<string, string>();
const mockRequest = jest.fn();
let mockUserId = 1;
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItemSync: (key: string) => mockStorage.get(key) ?? null,
  setItemSync: (key: string, value: string) => mockStorage.set(key, value),
  removeItemSync: (key: string) => mockStorage.delete(key),
} }));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: mockUserId } } }),
  useAuthActions: () => ({ request: mockRequest }),
}));
jest.mock('@/features/auth/bangumi-turnstile', () => ({ requestBangumiTurnstileToken: async () => 'test-token' }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/emoji-picker/bangumi-emoji-picker', () => ({ BangumiRichTextToolbar: () => null }));
jest.mock('@/features/shared/app-sheet', () => {
  const { View } = require('react-native');
  return { AppSheet: ({ visible, header, children }: { visible: boolean; header: React.ReactNode; children: React.ReactNode }) => visible ? <View>{header}{children}</View> : null };
});
const mockCreated = jest.fn();
const key = indexDraftKey(1);
let client: QueryClient;
function Page() {
  const [visible, setVisible] = useState(true);
  return <QueryClientProvider client={client}><ThemeProvider>
    <Button title="重新打开" onPress={() => setVisible(true)} />
    <IndexComposer onCreated={(id) => { mockCreated(id); setVisible(false); }} visible={visible} onClose={() => setVisible(false)} />
  </ThemeProvider></QueryClientProvider>;
}
beforeEach(() => {
  mockUserId = 1; mockStorage.clear(); mockRequest.mockReset(); mockCreated.mockClear();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity }, queries: { gcTime: Infinity, retry: false } } });
});
afterEach(async () => { await cleanup(); client.clear(); });

test('close/reopen and full remount retain the latest draft', async () => {
  const first = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '测试标题');
  await fireEvent.changeText(screen.getByLabelText('目录说明'), '继续写的草稿');
  await fireEvent.press(screen.getByLabelText('关闭'));
  expect(screen.queryByLabelText('目录说明')).toBeNull();
  await fireEvent.press(screen.getByText('重新打开'));
  expect(screen.getByLabelText('目录说明').props.value).toBe('继续写的草稿');
  expect(screen.getByLabelText('目录标题').props.value).toBe('测试标题');
  await first.unmount();
  await render(<Page />);
  expect(screen.getByLabelText('目录说明').props.value).toBe('继续写的草稿');
  expect(screen.getByLabelText('目录标题').props.value).toBe('测试标题');
  expect(mockRequest).not.toHaveBeenCalled();
});

test('failed send retains text across reopening; successful retry deletes only its draft', async () => {
  mockRequest.mockResolvedValueOnce(new Response(JSON.stringify({ message: '发送失败' }), { status: 400 }));
  await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '测试标题');
  await fireEvent.changeText(screen.getByLabelText('目录说明'), '待发送内容');
  await fireEvent.press(screen.getByLabelText('创建目录'));
  await screen.findByText('暂时没有成功，请稍后重试。');
  expect(JSON.parse(mockStorage.get(key)!)).toEqual({ title: '测试标题', desc: '待发送内容', isPrivate: false });
  await fireEvent.press(screen.getByLabelText('关闭'));
  await fireEvent.press(screen.getByText('重新打开'));
  expect(screen.getByLabelText('目录说明').props.value).toBe('待发送内容');
  mockStorage.set(indexDraftKey(2), '另一个账号的草稿');
  mockRequest.mockResolvedValueOnce(new Response(JSON.stringify({ id: 123 })));
  await fireEvent.press(screen.getByLabelText('创建目录'));
  await waitFor(() => expect(screen.queryByLabelText('目录说明')).toBeNull());
  expect(mockStorage.has(key)).toBe(false);
  expect(mockStorage.get(indexDraftKey(2))).toBe('另一个账号的草稿');
  expect(mockRequest).toHaveBeenLastCalledWith('/me/indexes', expect.objectContaining({ method: 'POST', body: expect.stringContaining('待发送内容') }));
});

test('switching accounts never shows or overwrites the other account draft', async () => {
  const view = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '测试标题');
  await fireEvent.changeText(screen.getByLabelText('目录说明'), '账号一');
  mockUserId = 2;
  await view.rerender(<Page />);
  expect(screen.getByLabelText('目录说明').props.value).toBe('');
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '测试标题');
  await fireEvent.changeText(screen.getByLabelText('目录说明'), '账号二');
  mockUserId = 1;
  await view.rerender(<Page />);
  expect(screen.getByLabelText('目录说明').props.value).toBe('账号一');
});

test('a late send completion does not erase the current account draft or close its composer', async () => {
  let resolve!: (value: Response) => void;
  mockRequest.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; }));
  const view = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '测试标题');
  await fireEvent.changeText(screen.getByLabelText('目录说明'), '账号一发送中');
  await fireEvent.press(screen.getByLabelText('创建目录'));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  mockUserId = 2;
  await view.rerender(<Page />);
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '测试标题');
  await fireEvent.changeText(screen.getByLabelText('目录说明'), '账号二正在写');
  await act(async () => { resolve(new Response(JSON.stringify({ id: 123 }))); });
  await waitFor(() => expect(mockStorage.has(key)).toBe(false));
  expect(screen.getByLabelText('目录说明').props.value).toBe('账号二正在写');
});


test('invalid saved JSON is preserved and cannot be overwritten by publishing', async () => {
  mockStorage.set(key, '{invalid');
  await render(<Page />);
  expect(screen.getByLabelText('目录说明').props.editable).toBe(false);
  await fireEvent.press(screen.getByLabelText('创建目录'));
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockStorage.get(key)).toBe('{invalid');
});


test('private visibility is restored with the new directory draft', async () => {
  const view = await render(<Page />);
  await fireEvent.changeText(screen.getByLabelText('目录标题'), '私密目录');
  await fireEvent(screen.getByLabelText('仅自己可见'), 'valueChange', true);
  await view.unmount();
  await render(<Page />);
  expect(screen.getByLabelText('仅自己可见').props.value).toBe(true);
});
