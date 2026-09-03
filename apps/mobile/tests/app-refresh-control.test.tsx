import { fireEvent, render } from '@testing-library/react-native';
import { createElement } from 'react';
import { RefreshControl, View } from 'react-native';

import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { LIGHT_COLORS } from '@/constants/theme';
import { ThemeProvider } from '@/features/theme/theme-provider';

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
  it('wires the refreshing flag and theme colors to RefreshControl', async () => {
    const onRefresh = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing />
      </ThemeProvider>,
    );

    const control = screen.getByTestId('refresh-control-probe');
    expect(control.props.refreshing).toBe(true);
    expect(control.props.tintColor).toBe(LIGHT_COLORS.accent);
    expect(control.props.progressBackgroundColor).toBe(LIGHT_COLORS.surface);
    expect(control.props.colors).toEqual([LIGHT_COLORS.accent]);
  });

  it('invokes onRefresh when the native control requests a refresh', async () => {
    const onRefresh = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing={false} />
      </ThemeProvider>,
    );

    fireEvent(screen.getByTestId('refresh-control-probe'), 'refresh');

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('propagates refreshing updates on rerender', async () => {
    const onRefresh = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing />
      </ThemeProvider>,
    );

    await screen.rerender(
      <ThemeProvider>
        <AppRefreshControl onRefresh={onRefresh} refreshing={false} />
      </ThemeProvider>,
    );

    expect(
      screen.getByTestId('refresh-control-probe').props.refreshing,
    ).toBe(false);
  });
});
