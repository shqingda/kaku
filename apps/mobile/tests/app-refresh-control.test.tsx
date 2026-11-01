import { fireEvent, render } from '@testing-library/react-native';
import { createElement } from 'react';
import { RefreshControl, View } from 'react-native';

import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { ThemeProvider } from '@/features/theme/theme-provider';
import { playLightHaptic } from '@/lib/haptics';

// RN 的 jest 渲染器只保留 schema 内的原生 props，RefreshControl 透传的 props
// 会被整层剥掉。这里把 RefreshControl 的渲染换成探针 View，直接断言透传值。
const renderRefreshControlSpy = jest
  .spyOn(RefreshControl.prototype, 'render')
  .mockImplementation(function (this: { props: Record<string, unknown> }) {
    return createElement(View, {
      ...this.props,
      testID: 'refresh-control-probe',
    });
  });

afterAll(() => {
  renderRefreshControlSpy.mockRestore();
});

describe('AppRefreshControl', () => {
  it('requests one refresh with haptic feedback and follows the refresh lifecycle', async () => {
    const onRefresh = jest.fn();
    jest.mocked(playLightHaptic).mockClear();
    const screen = await render(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing={false} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('refresh-control-probe').props.refreshing).toBe(false);
    expect(playLightHaptic).not.toHaveBeenCalled();
    await fireEvent(screen.getByTestId('refresh-control-probe'), 'refresh');

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(playLightHaptic).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('refresh-control-probe').props.refreshing).toBe(true);

    await screen.rerender(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing={false} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('refresh-control-probe').props.refreshing).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(playLightHaptic).toHaveBeenCalledTimes(1);
  });
});
