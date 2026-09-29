import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { UpdateDownloadSheet } from '@/features/app-update/update-download-sheet';
jest.mock('@/features/theme/theme-provider', () => ({ useTheme: () => ({}) }));
jest.mock('@/features/shared/app-sheet', () => ({ AppSheet: ({ visible, children }: any) => visible ? children : null }));
afterEach(cleanup);
test('download progress offers cancellation; install is only available after completion', async () => {
  const close = jest.fn(), install = jest.fn();
  const props = { visible: true, progress: 0.42, error: '', onClose: close, onInstall: install, onRetry: jest.fn(), onWeb: jest.fn() };
  const view = await render(<UpdateDownloadSheet {...props} status="downloading" />);
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(42);
  expect(screen.queryByText('安装更新')).toBeNull();
  await fireEvent.press(screen.getByText('取消下载'));
  expect(close).toHaveBeenCalledTimes(1);
  await view.rerender(<UpdateDownloadSheet {...props} status="ready" progress={1} />);
  expect(install).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('安装更新'));
  expect(install).toHaveBeenCalledTimes(1);
});
