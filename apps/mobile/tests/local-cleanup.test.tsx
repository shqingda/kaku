import { Alert } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import OfflineContentScreen from '@/app/offline-content';
import DiagnosticsScreen from '@/app/diagnostics';

jest.mock('expo-network', () => ({ useNetworkState: () => ({ isInternetReachable: true }) }));

const mockRemove = jest.fn();
const mockClear = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn() }, Stack: { Screen: () => null },
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/catalog/offline-subject-pack', () => ({
  listOfflineSubjects: async () => [{ subject: { id: 1, title: '测试条目' }, savedAt: 1 }],
  removeOfflineSubject: (id: number) => mockRemove(id),
}));
jest.mock('@/lib/diagnostic-log', () => ({
  readDiagnosticRecords: async () => [{ id: '1', name: 'Error', message: '测试错误', createdAt: 1 }],
  clearDiagnosticRecords: () => mockClear(),
}));
jest.mock('@/lib/sentry', () => ({ __esModule: true, default: { captureException: jest.fn() } }));
let alerts: jest.SpyInstance;
beforeEach(() => {
  mockRemove.mockReset().mockResolvedValue(undefined);
  mockClear.mockReset().mockResolvedValue(undefined);
  alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await cleanup(); alerts.mockRestore(); });

test('offline removal runs directly and failure can be retried in place', async () => {
  mockRemove.mockRejectedValueOnce(new Error('disk'));
  await render(<OfflineContentScreen />);
  await fireEvent.press(screen.getByLabelText('移除离线副本：测试条目'));
  expect(mockRemove).toHaveBeenCalledWith(1);
  expect(screen.getByText('测试条目')).toBeTruthy();
  expect(screen.getByText('移除失败，点击重试')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('移除离线副本：测试条目'));
  expect(screen.queryByText('测试条目')).toBeNull();
  expect(screen.getByText('暂无离线内容')).toBeTruthy();
  expect(alerts).not.toHaveBeenCalled();
});

test('diagnostics clear runs directly and retains records on failure', async () => {
  mockClear.mockRejectedValueOnce(new Error('disk'));
  await render(<DiagnosticsScreen />);
  await fireEvent.press(screen.getByText('清空记录'));
  expect(mockClear).toHaveBeenCalledTimes(1);
  expect(screen.getByText('测试错误')).toBeTruthy();
  await fireEvent.press(screen.getByText('清空失败，点击重试'));
  expect(mockClear).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('测试错误')).toBeNull();
  expect(alerts).not.toHaveBeenCalled();
});
