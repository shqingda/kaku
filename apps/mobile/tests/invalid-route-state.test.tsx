import { fireEvent, render } from '@testing-library/react-native';

import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { ThemeProvider } from '@/features/theme/theme-provider';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    replace: jest.fn(),
  },
  Stack: { Screen: () => null },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: (props: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { style: props.style }, props.children),
  };
});

import { router } from 'expo-router';

const mockRouter = jest.mocked(router);

describe('InvalidRouteState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(false);
  });

  it('renders the default title and message', async () => {
    const screen = await render(
      <ThemeProvider>
        <InvalidRouteState />
      </ThemeProvider>,
    );

    expect(screen.getByRole('header', { name: '无法打开页面' })).toBeTruthy();
    expect(screen.getByText('这个链接不完整或已经失效。')).toBeTruthy();
  });

  it('renders a custom title and message', async () => {
    const screen = await render(
      <ThemeProvider>
        <InvalidRouteState message="链接已过期" title="打不开啦" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('header', { name: '打不开啦' })).toBeTruthy();
    expect(screen.getByText('链接已过期')).toBeTruthy();
  });

  it('goes home and hides the back button when history is empty', async () => {
    const screen = await render(
      <ThemeProvider>
        <InvalidRouteState />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('button', { name: '返回' })).toBeNull();

    const homeButton = screen.getByRole('button', { name: '回到首页' });
    expect(homeButton.props.accessibilityHint).toBe('返回 Kaku 首页');

    fireEvent.press(homeButton);

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('offers going back when history is available', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    const screen = await render(
      <ThemeProvider>
        <InvalidRouteState />
      </ThemeProvider>,
    );

    const backButton = screen.getByRole('button', { name: '返回' });
    expect(backButton.props.accessibilityHint).toBe('返回上一个页面');

    fireEvent.press(backButton);

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
