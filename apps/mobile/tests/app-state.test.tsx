import { fireEvent, render } from '@testing-library/react-native';

import { AppState } from '@/features/shared/app-state';
import { ThemeProvider } from '@/features/theme/theme-provider';

describe('AppState', () => {
  it('renders title and text', async () => {
    const screen = await render(
      <ThemeProvider>
        <AppState title="加载失败" text="网络请求超时" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('header', { name: '加载失败' })).toBeTruthy();
    expect(screen.getByText('网络请求超时')).toBeTruthy();
  });

  it('shows a retry button only when an action is provided', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <AppState title="加载失败" text="网络请求超时" action={onRetry} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();

    await screen.rerender(
      <ThemeProvider>
        <AppState title="没有更多" text="列表已经到底啦" />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('fires the retry action when the button is pressed', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <AppState title="加载失败" text="网络请求超时" action={onRetry} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
