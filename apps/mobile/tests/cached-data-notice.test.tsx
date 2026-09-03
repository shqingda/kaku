import { fireEvent, render } from '@testing-library/react-native';

import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ThemeProvider } from '@/features/theme/theme-provider';

describe('CachedDataNotice', () => {
  it('renders the cached-data copy as an alert', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <CachedDataNotice onRetry={onRetry} />
      </ThemeProvider>,
    );

    // RNTL 只把 accessible 的元素纳入 role 查询，普通 View 的 alert 角色走 props 断言。
    expect(screen.root?.props.accessibilityRole).toBe('alert');
    expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
    expect(screen.getByText('网络恢复后可重新读取最新数据。')).toBeTruthy();
  });

  it('fires onRetry when the refresh button is pressed', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <CachedDataNotice onRetry={onRetry} />
      </ThemeProvider>,
    );

    const button = screen.getByRole('button', { name: '重新获取最新内容' });
    expect(button.props.accessibilityLabel).toBe('重新获取最新内容');

    fireEvent.press(button);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
