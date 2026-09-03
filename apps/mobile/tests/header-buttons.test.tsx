import { fireEvent, render } from '@testing-library/react-native';

import { HeaderBackButton } from '@/features/shared/header-back-button';
import { HeaderHomeButton } from '@/features/shared/header-home-button';
import { HeaderIconButton } from '@/features/shared/header-icon-button';
import { ThemeProvider } from '@/features/theme/theme-provider';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    dismissTo: jest.fn(),
  },
}));

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

import { router } from 'expo-router';

const mockRouter = jest.mocked(router);

function withProvider(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('HeaderIconButton', () => {
  it('exposes the label, role and hint, and fires onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      withProvider(
        <HeaderIconButton
          accessibilityHint="打开搜索"
          accessibilityLabel="搜索"
          icon={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
          onPress={onPress}
        />,
      ),
    );

    const button = screen.getByRole('button', { name: '搜索' });
    expect(button.props.accessibilityHint).toBe('打开搜索');

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('HeaderBackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.canGoBack.mockReturnValue(true);
  });

  it('goes back when navigation history is available', async () => {
    const screen = await render(withProvider(<HeaderBackButton />));

    const button = screen.getByRole('button', { name: '返回' });
    expect(button.props.accessibilityHint).toBe('返回上一个页面');

    fireEvent.press(button);

    expect(mockRouter.canGoBack).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('falls back to dismissing to home when there is no history', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const screen = await render(withProvider(<HeaderBackButton />));

    fireEvent.press(screen.getByRole('button', { name: '返回' }));

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});

describe('HeaderHomeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dismisses to home with the right accessibility metadata', async () => {
    const screen = await render(withProvider(<HeaderHomeButton />));

    const button = screen.getByRole('button', { name: '回到首页' });
    expect(button.props.accessibilityHint).toBe('返回 Kaku 首页');

    fireEvent.press(button);

    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});
