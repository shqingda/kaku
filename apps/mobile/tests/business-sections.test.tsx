import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { HomeMediaSection } from '@/features/home/home-media-section';
import { CommentPreviewSection } from '@/features/subject-detail/comment-preview-section';
import { CollectionBoxSheet } from '@/features/subject-detail/collection-box-sheet';
import { ThemeProvider } from '@/features/theme/theme-provider';
import type { WatchingItem } from '@/features/watching/model';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Link: ({ children }: any) => children }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({ usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }) }));
jest.mock('@/lib/use-reduce-motion', () => ({ useReduceMotion: () => true }));
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/shared/app-sheet', () => {
  const { View } = require('react-native');
  return { AppSheet: ({ children, header, visible }: any) => visible ? <View>{header}{children}</View> : null };
});
const item: WatchingItem = { id: 9, title: '测试条目', coverUrl: '', watchedEpisodeNumbers: [], totalEpisodes: 12, year: 2026, summary: '', episodeAirDates: [], collectionStatus: 'doing', comment: '' };

test('home collection error retries and empty success does not look like loading', async () => {
  const retry = jest.fn();
  const props = { error: true, items: [], loading: false, onRetry: retry, onSubjectTypeChange: jest.fn(), subjectType: 2, title: '在看', total: 0, username: 'tester' };
  const view = await render(<ThemeProvider><HomeMediaSection {...props} /></ThemeProvider>);
  await fireEvent.press(screen.getByText('暂时没有加载出来，点此重试'));
  expect(retry).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemeProvider><HomeMediaSection {...props} error={false} /></ThemeProvider>);
  expect(screen.getByText('这里还没有条目')).toBeTruthy();
});
test('subject comments show loading, retry error, then empty discussion entry', async () => {
  const retry = jest.fn(); const open = jest.fn();
  const props = { comments: [], isError: false, isPending: true, onRetry: retry, onOpenMore: open };
  const view = await render(<ThemeProvider><CommentPreviewSection {...props} /></ThemeProvider>);
  expect(screen.getByText('正在读取 Bangumi 吐槽箱…')).toBeTruthy();
  await view.rerender(<ThemeProvider><CommentPreviewSection {...props} isPending={false} isError /></ThemeProvider>);
  await fireEvent.press(screen.getByText('重试'));
  expect(retry).toHaveBeenCalledTimes(1);
  await view.rerender(<ThemeProvider><CommentPreviewSection {...props} isPending={false} total={0} /></ThemeProvider>);
  expect(screen.getByText('Bangumi 还没有关于这个条目的吐槽。')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('查看更多吐槽'));
  expect(open).toHaveBeenCalledTimes(1);
});
test('collection edits reach save and a dirty close requires discard', async () => {
  const save = jest.fn(); const close = jest.fn();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await render(<ThemeProvider><CollectionBoxSheet item={item} visible isSaving={false} supportsProgress onSave={save} onClose={close} onRemove={jest.fn()} /></ThemeProvider>);
    await fireEvent.changeText(screen.getByLabelText('吐槽'), '保留我的想法');
    await fireEvent.press(screen.getByLabelText('保存收藏'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ comment: '保留我的想法' }));
    await fireEvent.press(screen.getByLabelText('关闭收藏盒'));
    expect(close).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('放弃未保存的修改？', expect.any(String), expect.any(Array));
  } finally { alert.mockRestore(); }
});

test('collection saving preserves input until a confirmed item update or reopening', async () => {
  const props = { item, visible: true, isSaving: false, supportsProgress: true, onSave: jest.fn(), onClose: jest.fn(), onRemove: jest.fn() };
  const view = await render(<ThemeProvider><CollectionBoxSheet {...props} /></ThemeProvider>);
  await fireEvent.changeText(screen.getByLabelText('吐槽'), '等待保存');
  await fireEvent.changeText(screen.getByLabelText('已看集数'), '3');
  await fireEvent.press(screen.getByLabelText('保存收藏'));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ comment: '等待保存', watchedCount: 3 }));
  await view.rerender(<ThemeProvider><CollectionBoxSheet {...props} isSaving /></ThemeProvider>);
  await fireEvent.press(screen.getByLabelText('保存收藏'));
  expect(props.onSave).toHaveBeenCalledTimes(1);
  // Parent reports a failed request: original item remains, local input survives.
  await view.rerender(<ThemeProvider><CollectionBoxSheet {...props} /></ThemeProvider>);
  expect(screen.getByLabelText('吐槽').props.value).toBe('等待保存');
  await view.rerender(<ThemeProvider><CollectionBoxSheet {...props} visible={false} /></ThemeProvider>);
  await view.rerender(<ThemeProvider><CollectionBoxSheet {...props} /></ThemeProvider>);
  expect(screen.getByLabelText('吐槽').props.value).toBe('');
  await view.rerender(<ThemeProvider><CollectionBoxSheet {...props} item={{ ...item, comment: '已保存' }} /></ThemeProvider>);
  expect(screen.getByLabelText('吐槽').props.value).toBe('已保存');
});
