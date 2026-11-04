import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import AppIconScreen from '@/app/app-icon';
import { ThemeProvider } from '@/features/theme/theme-provider';

type MockNative = {
  supportsAlternateIcons: boolean;
  getAppIconName: jest.Mock<string | null, []>;
  setAlternateAppIcon: jest.Mock<Promise<string | null>, [string | null]>;
};
let mockNative: MockNative | null = null;
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: (name: string) => (name === 'ExpoAlternateAppIcons' ? mockNative : jest.requireActual('expo').requireOptionalNativeModule(name)),
}));

function nativeIcons(initial: string | null): MockNative {
  let active = initial;
  return {
    supportsAlternateIcons: true,
    getAppIconName: jest.fn(() => active),
    setAlternateAppIcon: jest.fn(async (name: string | null) => { active = name; return name; }),
  };
}

const renderScreen = () => render(<ThemeProvider><AppIconScreen /></ThemeProvider>);
const checked = (id: string) => screen.getByTestId(`app-icon-${id}`).props.accessibilityState.checked;

afterEach(cleanup);

test('marks the default icon and switches to an alternate one', async () => {
  mockNative = nativeIcons(null);
  await renderScreen();
  expect(checked('ink')).toBe(true);
  await act(async () => { fireEvent.press(screen.getByTestId('app-icon-color')); });
  expect(mockNative.setAlternateAppIcon).toHaveBeenCalledWith('Color');
  expect(checked('color')).toBe(true);
  expect(checked('ink')).toBe(false);
  await act(async () => { fireEvent.press(screen.getByTestId('app-icon-ink')); });
  expect(mockNative.setAlternateAppIcon).toHaveBeenLastCalledWith(null);
  expect(checked('ink')).toBe(true);
});

test('reports a switch the system did not apply instead of claiming success', async () => {
  mockNative = nativeIcons(null);
  // Android 原生实现会吞掉异常：调用成功返回，但系统里的图标没变。
  mockNative.setAlternateAppIcon.mockResolvedValueOnce('Lower');
  await renderScreen();
  await act(async () => { fireEvent.press(screen.getByTestId('app-icon-lower')); });
  expect(screen.getByRole('alert')).toHaveTextContent('图标没有切换成功，请重试。');
  expect(checked('ink')).toBe(true);
  expect(checked('lower')).toBe(false);
});

test('explains when the installed build has no icon module', async () => {
  mockNative = null;
  await renderScreen();
  expect(screen.getByRole('alert')).toHaveTextContent('当前安装的 Kaku 还不能切换图标，请安装最新版本后再试。');
  expect(screen.getByTestId('app-icon-color')).toBeDisabled();
});
