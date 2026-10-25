import { createElement } from 'react';
import { RefreshControl, Text as MockText, TextInput as MockTextInput, View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import PublicUserScreen from '@/app/user/[username]';
import { ThemeProvider } from '@/features/theme/theme-provider';
import type { PublicUserBlog, PublicUserCollection, PublicUserFriend, PublicTimelineItem } from '@/features/users/model';
import { usePublicUserCollections } from '@/features/users/use-public-user';

const refreshControlSpy = jest.spyOn(RefreshControl.prototype, 'render').mockImplementation(
  function (this: { props: Record<string, unknown> }) {
    return createElement(View, { ...this.props, testID: 'profile-refresh' });
  },
);
afterAll(() => refreshControlSpy.mockRestore());

const profile = { id: 1, nickname: '公开昵称', username: 'canonical-user', sign: '公开签名' };
function preview<T>(items: T[] = [], total = items.length) {
  return { data: { pages: [{ items, total }] }, isPending: false, isError: false, isRefetching: false, hasNextPage: false, refetch: jest.fn().mockResolvedValue(undefined) };
}
let mockUser = { data: profile as typeof profile | undefined, isPending: false, isError: false, isRefetching: false, refetch: jest.fn() };
let mockBlogs = preview<PublicUserBlog>();
let mockCollections = preview<PublicUserCollection>();
let mockFriends = preview<PublicUserFriend>();
let mockTimeline = preview<PublicTimelineItem>();
let mockSession: { user: { username: string } } | null = null;

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ username: 'route-user' }),
  Stack: { Screen: ({ options }: { options: { headerRight: () => React.ReactNode } }) => options.headerRight() },
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: mockSession }) }));
jest.mock('@/features/users/use-public-user', () => ({
  usePublicUser: () => mockUser,
  usePublicUserBlogs: () => mockBlogs,
  usePublicUserCollections: jest.fn(() => mockCollections),
  usePublicUserFriends: () => mockFriends,
  usePublicUserTimeline: () => mockTimeline,
}));
jest.mock('@/features/users/friend-action', () => ({ FriendAction: () => <MockText>好友操作</MockText> }));
jest.mock('@/features/users/profile-overflow', () => ({ ProfileOverflow: () => <MockText>用户菜单</MockText> }));
jest.mock('@/features/shared/header-share-button', () => ({ HeaderShareButton: ({ path }: { path: string }) => <MockText>{path}</MockText> }));
jest.mock('@/features/users/public-user-friend-card', () => ({ PublicUserFriendCard: ({ friend, onPress }: { friend: PublicUserFriend; onPress: () => void }) => <MockText onPress={onPress}>{friend.nickname}</MockText> }));
jest.mock('@/features/users/public-user-blog-row', () => ({ PublicUserBlogRow: ({ item, onPress }: { item: PublicUserBlog; onPress: () => void }) => <MockText onPress={onPress}>{item.title}</MockText> }));
jest.mock('@/features/users/public-user-collection-row', () => ({ PublicUserCollectionRow: ({ item, onPress }: { item: PublicUserCollection; onPress: () => void }) => <MockText onPress={onPress}>{item.title}</MockText> }));
jest.mock('@/features/users/public-user-timeline-row', () => ({ PublicUserTimelineRow: ({ item, onPress }: { item: PublicTimelineItem; onPress?: () => void }) => <MockText onPress={onPress}>{item.text}</MockText> }));
jest.mock('@/features/timeline/timeline-composer', () => ({
  TimelineComposer: function Composer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const [draft, setDraft] = require('react').useState('');
    return visible ? <><MockTextInput accessibilityLabel="动态草稿" value={draft} onChangeText={setDraft} /><MockText onPress={onClose}>关闭编辑</MockText></> : null;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { data: profile, isPending: false, isError: false, isRefetching: false, refetch: jest.fn().mockResolvedValue(undefined) };
  mockBlogs = preview(); mockCollections = preview(); mockFriends = preview(); mockTimeline = preview();
  mockSession = null;
});

const page = () => <ThemeProvider><PublicUserScreen /></ThemeProvider>;

test('profile links retain the route share URL, canonical usernames and first-page previews', async () => {
  mockSession = { user: { username: 'viewer' } };
  mockFriends = preview([{ username: 'friend-name', nickname: '好友甲' }], 2);
  mockBlogs = preview([{ id: 11, title: '日志甲', summary: '', replyCount: 0, updatedAt: 0 }], 2);
  mockCollections = preview([{ id: 22, title: '收藏甲', progress: 0, volumeProgress: 0, subjectType: 2, totalEpisodes: 12, updatedAt: '' }], 2);
  mockCollections.data.pages.push({ items: [{ ...mockCollections.data.pages[0].items[0], id: 23, title: '第二页收藏' }], total: 2 });
  mockTimeline = preview([{ id: 33, text: '动态甲', subjectId: 44, createdAt: 0 }]);
  mockFriends.hasNextPage = mockBlogs.hasNextPage = mockCollections.hasNextPage = true;
  await render(page());

  expect(screen.getByText('/user/route-user')).toBeTruthy();
  expect(screen.getByText('@canonical-user')).toBeTruthy();
  expect(screen.getByText('好友操作')).toBeTruthy();
  expect(screen.queryByText('第二页收藏')).toBeNull();
  expect(screen.queryByLabelText('查看角色与人物收藏')).toBeNull();
  expect(screen.queryByLabelText('发布动态')).toBeNull();
  for (const [label, pathname, params] of [
    ['好友甲', '/user/[username]', { username: 'friend-name' }],
    ['日志甲', '/blog/[id]', { id: '11' }],
    ['收藏甲', '/subject/[id]', { id: '22' }],
    ['动态甲', '/subject/[id]', { id: '44' }],
  ] as const) {
    await fireEvent.press(screen.getByText(label));
    expect(router.push).toHaveBeenLastCalledWith({ pathname, params });
  }
  for (const [hint, pathname] of [
    ['打开完整好友列表', '/user/friends/[username]'],
    ['打开完整日志列表', '/user/blogs/[username]'],
  ] as const) {
    await fireEvent.press(screen.getByHintText(hint));
    expect(router.push).toHaveBeenLastCalledWith({ pathname, params: { username: 'canonical-user' } });
  }
  await fireEvent.press(screen.getByLabelText('查看全部动态'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/user/timeline/[username]', params: { username: 'canonical-user' } });
  await fireEvent.press(screen.getByLabelText('书籍分类'));
  expect(usePublicUserCollections).toHaveBeenLastCalledWith('route-user', 1);
  await fireEvent.press(screen.getByHintText('打开完整书籍收藏列表'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/user/collections/[username]', params: { username: 'canonical-user', type: '1' } });
});

test('own profile keeps its composer draft mounted across close, filter and refetch renders', async () => {
  mockSession = { user: { username: 'canonical-user' } };
  const view = await render(page());
  expect(screen.queryByText('好友操作')).toBeNull();
  await fireEvent.press(screen.getByLabelText('发布动态'));
  await fireEvent.changeText(screen.getByLabelText('动态草稿'), '未发布内容');
  await fireEvent.press(screen.getByText('关闭编辑'));
  await fireEvent.press(screen.getByLabelText('书籍分类'));
  mockUser.isRefetching = true;
  await view.rerender(page());
  await fireEvent.press(screen.getByLabelText('发布动态'));
  expect(screen.getByLabelText('动态草稿').props.value).toBe('未发布内容');
});

test.each(['friends', 'blogs', 'timeline', 'collections'])('%s failure retries only its section and leaves other content available', async (section) => {
  const query = { friends: mockFriends, blogs: mockBlogs, timeline: mockTimeline, collections: mockCollections }[section]!;
  query.isError = true;
  await render(page());
  expect(screen.getByText('公开昵称')).toBeTruthy();
  expect(screen.getByText('这一部分暂时读取失败。')).toBeTruthy();
  await fireEvent.press(screen.getByText('重试'));
  expect(query.refetch).toHaveBeenCalledTimes(1);
  for (const other of [mockUser, mockFriends, mockBlogs, mockTimeline, mockCollections]) {
    if (other !== query) expect(other.refetch).not.toHaveBeenCalled();
  }
});

test('loading, unavailable profile and guest states stay explicit', async () => {
  mockUser.isPending = true;
  const view = await render(page());
  expect(screen.getByText('正在读取公开资料。')).toBeTruthy();
  mockUser.isPending = false; mockUser.isError = true; mockUser.data = undefined;
  await view.rerender(page());
  expect(screen.getByText('用户资料读取失败')).toBeTruthy();
  await fireEvent.press(screen.getByText('重试'));
  expect(mockUser.refetch).toHaveBeenCalledTimes(1);
  mockUser.isError = false; mockUser.data = profile; mockBlogs.isPending = true;
  await view.rerender(page());
  expect(screen.getByText('正在读取…')).toBeTruthy();
  expect(screen.queryByText('好友操作')).toBeNull();
  expect(screen.queryByLabelText('发布动态')).toBeNull();
});

test('pull to refresh includes all five queries and reflects section refetching', async () => {
  mockTimeline.isRefetching = true;
  await render(page());
  const control = screen.getByTestId('profile-refresh');
  expect(control.props.refreshing).toBe(true);
  await fireEvent(control, 'refresh');
  for (const query of [mockUser, mockFriends, mockBlogs, mockTimeline, mockCollections]) expect(query.refetch).toHaveBeenCalledTimes(1);
});
