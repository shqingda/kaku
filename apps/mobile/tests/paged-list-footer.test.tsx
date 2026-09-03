import { fireEvent, render } from '@testing-library/react-native';

import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ThemeProvider } from '@/features/theme/theme-provider';

describe('PagedListFooter', () => {
  it('shows a loading hint without a retry button while fetching more', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage
          isError={false}
          isFetching
          loadedCount={8}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('正在加载更多结果')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('prefers the loading state over the error state', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage
          isError
          isFetching
          loadedCount={8}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('正在加载更多结果')).toBeTruthy();
    expect(screen.queryByText('后续结果加载失败')).toBeNull();
  });

  it('shows an error message and fires onRetry when loading more fails', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage
          isError
          isFetching={false}
          loadedCount={8}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.root?.props.accessibilityRole).toBe('alert');
    expect(screen.getByText('后续结果加载失败')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the end-of-list count without a known total', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage={false}
          isError={false}
          isFetching={false}
          loadedCount={8}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('已加载全部 8 个结果')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the end-of-list count against a known total', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage={false}
          isError={false}
          isFetching={false}
          loadedCount={8}
          onRetry={onRetry}
          total={24}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('已显示全部 8 个结果')).toBeTruthy();
  });

  it('shows the keep-scrolling hint while more pages exist', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage
          isError={false}
          isFetching={false}
          loadedCount={8}
          onRetry={onRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('继续上滑加载更多 · 已显示 8 个结果')).toBeTruthy();
  });

  it('shows the keep-scrolling hint with progress against a known total', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <PagedListFooter
          hasNextPage
          isError={false}
          isFetching={false}
          loadedCount={8}
          onRetry={onRetry}
          total={24}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByText('继续上滑加载更多 · 已显示 8 / 24'),
    ).toBeTruthy();
  });
});
