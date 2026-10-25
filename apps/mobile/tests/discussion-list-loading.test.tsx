import { cleanup, fireEvent, render } from '@testing-library/react-native';
import SubjectDiscussionsScreen from '@/app/subject/[id]/discussions';
import type { DiscussionTopicPage } from '@/features/discussions/model';

const mockRefetch = jest.fn();
const mockRouter = { push: jest.fn() };
let mockQuery: {
  data: { pages: DiscussionTopicPage[] } | undefined;
  isPending: boolean;
  isPaused: boolean;
  isError: boolean;
  isRefetching: boolean;
};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: '1' }),
  usePathname: () => '/subject/1/discussions',
  useRouter: () => mockRouter,
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({
  useCatalogSubject: () => ({ data: { title: '测试条目' }, isPending: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/features/discussions/use-bangumi-discussions', () => ({
  useBangumiSubjectTopics: () => ({ ...mockQuery, refetch: mockRefetch, hasNextPage: false }),
}));
jest.mock('@/features/discussions/topic-composer', () => ({ TopicComposer: () => null }));
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));

beforeEach(() => {
  mockRefetch.mockReset().mockResolvedValue(undefined);
  mockQuery = { data: undefined, isPending: true, isPaused: false, isError: false, isRefetching: false };
});
afterEach(cleanup);

test('first load uses a list skeleton, paused or failed reads expose retry, and only success can be empty', async () => {
  const view = await render(<SubjectDiscussionsScreen />);
  expect(view.getByLabelText('正在读取 Bangumi 讨论…')).toBeTruthy();
  expect(view.queryByText('Bangumi 还没有关于这个条目的讨论。')).toBeNull();

  mockQuery.isPaused = true;
  await view.rerender(<SubjectDiscussionsScreen />);
  expect(view.queryByLabelText('正在读取 Bangumi 讨论…')).toBeNull();
  expect(view.getByText('网络暂不可用，恢复连接后可重试讨论。')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('重试加载讨论'));
  expect(mockRefetch).toHaveBeenCalledTimes(1);

  Object.assign(mockQuery, { isPaused: false, isPending: false, isError: true });
  await view.rerender(<SubjectDiscussionsScreen />);
  expect(view.getByText('讨论加载失败，请检查网络后重试。')).toBeTruthy();
  expect(view.queryByText('Bangumi 还没有关于这个条目的讨论。')).toBeNull();

  Object.assign(mockQuery, { isError: false, data: { pages: [{ topics: [], total: 0 }] } });
  await view.rerender(<SubjectDiscussionsScreen />);
  expect(view.getByText('Bangumi 还没有关于这个条目的讨论。')).toBeTruthy();
});

test('refresh and refresh failure preserve cached topics while the notice can retry', async () => {
  mockQuery = {
    data: { pages: [{ topics: [{ id: '7', subjectId: 1, title: '保留的话题', author: '作者',
      createdAt: '刚刚', updatedAt: '刚刚', replies: [] }], total: 1 }] },
    isPending: false, isPaused: false, isError: false, isRefetching: true,
  };
  const view = await render(<SubjectDiscussionsScreen />);
  expect(view.getByText('保留的话题')).toBeTruthy();
  expect(view.queryByLabelText('正在读取 Bangumi 讨论…')).toBeNull();

  Object.assign(mockQuery, { isRefetching: false, isError: true });
  await view.rerender(<SubjectDiscussionsScreen />);
  expect(view.getByText('保留的话题')).toBeTruthy();
  expect(view.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('重新获取最新内容'));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});
