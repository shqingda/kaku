import { Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { renderRouter, screen, fireEvent, act, waitFor } from 'expo-router/testing-library';
import { AccountSignInPanel } from '@/features/account/account-sign-in-panel';
import NotFoundScreen from '@/app/+not-found';
import { ThemeProvider } from '@/features/theme/theme-provider';
import { rememberReturnTo, takeReturnTo } from '@/lib/auth-redirect';

const mockSignIn = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ error: null, isSigningIn: false, signIn: mockSignIn }),
}));
function Detail() {
  const { id, episodeNumber } = useLocalSearchParams();
  return <Text>{`subject:${id},episode:${episodeNumber ?? ''}`}</Text>;
}
const routes = {
  _layout: () => <ThemeProvider><Stack /></ThemeProvider>,
  index: () => <Text>首页</Text>,
  account: AccountSignInPanel,
  'subject/[id]': Detail,
  'subject/[id]/episode/[episodeNumber]': Detail,
  '+not-found': NotFoundScreen,
};
beforeEach(() => {
  takeReturnTo();
  mockSignIn.mockReset().mockResolvedValue(true);
});
afterEach(() => { jest.useRealTimers(); });

test('cold deep link resolves nested subject and episode parameters', async () => {
  // SDK 57 attaches route helpers to the render promise; RNTL 14 renders asynchronously.
  const routeState = renderRouter(routes, { initialUrl: '/subject/9/episode/3' });
  await routeState;
  expect(screen.getByText('subject:9,episode:3')).toBeTruthy();
  expect(routeState.getPathname()).toBe('/subject/9/episode/3');
});

test('nested navigation preserves the subject on back', async () => {
  const routeState = renderRouter(routes, { initialUrl: '/subject/9' });
  await routeState;
  await act(async () => { router.push('/subject/9/episode/3'); });
  expect(routeState.getPathname()).toBe('/subject/9/episode/3');
  await act(async () => { router.back(); });
  expect(routeState.getPathname()).toBe('/subject/9');
});

test('successful login dismisses to the requested page without retaining account', async () => {
  const routeState = renderRouter(routes, { initialUrl: '/subject/9' });
  await routeState;
  rememberReturnTo('/subject/9');
  await act(async () => { router.push('/account'); });
  await fireEvent.press(screen.getByText('使用 Bangumi 登录'));
  await waitFor(() => expect(routeState.getPathname()).toBe('/subject/9'));
  expect(takeReturnTo()).toBeUndefined();
  expect(router.canGoBack()).toBe(false);
});

test('cancelled login preserves the destination for retry', async () => {
  mockSignIn.mockResolvedValueOnce(false);
  rememberReturnTo('/subject/9/episode/3');
  const routeState = renderRouter(routes, { initialUrl: '/account' });
  await routeState;
  await fireEvent.press(screen.getByText('使用 Bangumi 登录'));
  expect(routeState.getPathname()).toBe('/account');
  await fireEvent.press(screen.getByText('使用 Bangumi 登录'));
  await waitFor(() => expect(routeState.getPathname()).toBe('/subject/9/episode/3'));
});

test('invalid cold link offers a working return to home', async () => {
  const routeState = renderRouter(routes, { initialUrl: '/missing/path' });
  await routeState;
  expect(screen.getByText('这个页面暂时找不到')).toBeTruthy();
  await fireEvent.press(screen.getByText('回到首页'));
  expect(routeState.getPathname()).toBe('/');
});
