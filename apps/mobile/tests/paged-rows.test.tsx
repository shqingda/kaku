import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { GroupTopicRow } from '@/features/community/group-topic-row';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { NotificationRow } from '@/features/notifications/notification-row';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { PublicUserBlogRow } from '@/features/users/public-user-blog-row';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import { PublicUserTimelineRow } from '@/features/users/public-user-timeline-row';
import { LIGHT_COLORS } from '@/constants/theme';

const mockPrefetch = jest.fn();
const mockCancelPrefetch = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Image: (props: object) => React.createElement(View, props) };
});

jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { SymbolView: (props: object) => React.createElement(View, props) };
});

jest.mock('@/features/catalog/use-catalog-subject', () => ({
  usePrefetchSubject: () => ({
    cancel: mockCancelPrefetch,
    prefetch: mockPrefetch,
  }),
}));

jest.mock('@/features/shared/bangumi-text', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { BangumiText: (props: object) => React.createElement(Text, props) };
});

const mockRouterPush = jest.mocked(router.push);

describe('paged row interaction contracts', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockPrefetch.mockReset();
    mockCancelPrefetch.mockReset();
  });

  it('prefetches a ranked subject on press-in and cancels on press-out', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <RankedSubjectRow
        hasDivider
        item={{
          date: '2024-01-05',
          id: 123,
          score: 8.7,
          title: '葬送的芙莉莲',
          type: 2,
        }}
        onPress={onPress}
        position={1}
      />,
    );
    const row = screen.getByLabelText('排行榜第 1 名：葬送的芙莉莲');

    await fireEvent(row, 'pressIn');
    await fireEvent(row, 'pressOut');
    await fireEvent.press(row);

    expect(mockPrefetch).toHaveBeenCalledWith(123);
    expect(mockCancelPrefetch).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('8.7 分 · 2024')).toBeTruthy();
  });

  it('shows collection progress and preserves a custom trailing control', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <PublicUserCollectionRow
        item={{
          collectionStatus: 'doing',
          id: 456,
          progress: 9,
          rate: 8,
          subjectType: 2,
          title: '迷宫饭',
          totalEpisodes: 24,
          updatedAt: '2026-09-04T00:00:00Z',
          volumeProgress: 0,
        }}
        onPress={onPress}
        trailing={<Text>编辑收藏</Text>}
      />,
    );
    const row = screen.getByLabelText('打开收藏条目：迷宫饭');

    await fireEvent(row, 'pressIn');
    await fireEvent(row, 'pressOut');
    await fireEvent.press(row);

    expect(screen.getByText(/9\/24 集 · 8 分/)).toBeTruthy();
    expect(screen.getByText('编辑收藏')).toBeTruthy();
    expect(mockPrefetch).toHaveBeenCalledWith(456);
    expect(mockCancelPrefetch).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a group topic byline and exposes the reply count', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <GroupTopicRow
        hasDivider={false}
        onPress={onPress}
        showGroup
        topic={{
          author: 'Alice',
          groupTitle: '动画讨论',
          id: 7,
          replyCount: 12,
          title: '本季度最喜欢的演出回',
          updatedAt: Date.now(),
        }}
      />,
    );

    await fireEvent.press(screen.getByLabelText('打开小组话题：本季度最喜欢的演出回'));

    expect(screen.getByText(/动画讨论 · Alice/)).toBeTruthy();
    expect(screen.getByLabelText('12 条回复')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks an unread notification and opens its typed destination', async () => {
    const onRead = jest.fn();
    const screen = await render(
      <NotificationRow
        colors={LIGHT_COLORS}
        hasDivider={false}
        item={{
          action: '回复了你',
          createdAt: Date.now(),
          id: 8,
          sender: { nickname: 'Bob', username: 'bob' },
          target: { id: 99, kind: 'blog', replyId: 3 },
          title: '旅行日志',
          unread: true,
        }}
        onRead={onRead}
      />,
    );

    await fireEvent.press(screen.getByLabelText('未读，Bob回复了你：旅行日志'));

    expect(onRead).toHaveBeenCalledWith(8);
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/blog/[id]',
      params: { id: '99', replyId: '3' },
    });
  });

  it('does not mark an already-read notification again', async () => {
    const onRead = jest.fn();
    const screen = await render(
      <NotificationRow
        colors={LIGHT_COLORS}
        hasDivider
        item={{
          action: '关注了你',
          createdAt: Date.now(),
          id: 9,
          sender: { nickname: 'Carol', username: 'carol' },
          target: { kind: 'user', username: 'carol' },
          title: '',
          unread: false,
        }}
        onRead={onRead}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Carol关注了你：'));

    expect(onRead).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/user/[username]',
      params: { username: 'carol' },
    });
  });

  it('keeps a timeline row non-interactive when it has no destination', async () => {
    const screen = await render(
      <PublicUserTimelineRow
        item={{ createdAt: Date.now(), id: 1, text: '完成了每日进度' }}
      />,
    );

    const row = screen.getByLabelText('完成了每日进度');
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(row.props.accessibilityHint).toBeUndefined();
    expect(row.props.accessibilityState?.disabled).toBe(true);
  });

  it('opens an interactive public timeline row', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <PublicUserTimelineRow
        item={{
          createdAt: Date.now(),
          id: 2,
          leadingText: '收藏了 ',
          subjectId: 10,
          subjectTitle: '星际牛仔',
          text: '收藏了星际牛仔',
        }}
        onPress={onPress}
      />,
    );

    await fireEvent.press(screen.getByLabelText('收藏了星际牛仔'));

    expect(screen.getByText('《星际牛仔》')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses an explicit empty-summary fallback for blog rows', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <PublicUserBlogRow
        item={{
          id: 3,
          replyCount: 0,
          summary: '',
          title: '无题',
          updatedAt: Date.now(),
        }}
        onPress={onPress}
      />,
    );

    expect(screen.getByText('暂无摘要')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('打开日志：无题'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('routes friend timeline subject and avatar presses independently', async () => {
    const screen = await render(
      <FriendTimelineRow
        item={{
          createdAt: Date.now(),
          id: 4,
          leadingText: '收藏了 ',
          replies: 2,
          subjectId: 11,
          subjectTitle: '虫师',
          text: '收藏了虫师',
          user: { nickname: 'Dave', username: 'dave' },
        }}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Dave：收藏了虫师'));
    expect(mockRouterPush).toHaveBeenLastCalledWith({
      pathname: '/subject/[id]',
      params: { id: '11' },
    });

    await fireEvent.press(screen.getByLabelText('打开Dave的公开主页'));
    expect(mockRouterPush).toHaveBeenLastCalledWith({
      pathname: '/user/[username]',
      params: { username: 'dave' },
    });
    expect(screen.getByText('2 回复')).toBeTruthy();
  });
});
