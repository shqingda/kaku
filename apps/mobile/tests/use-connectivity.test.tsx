import { onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import * as Network from 'expo-network';

import { useIsOffline } from '@/lib/use-connectivity';

jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(),
}));

const useNetworkStateMock = jest.mocked(Network.useNetworkState);
const setOnlineSpy = jest
  .spyOn(onlineManager, 'setOnline')
  .mockImplementation(() => {});

function mockNetworkState(isInternetReachable: boolean | undefined) {
  useNetworkStateMock.mockReturnValue({ isInternetReachable });
}

describe('useIsOffline', () => {
  beforeEach(() => {
    useNetworkStateMock.mockReset();
    setOnlineSpy.mockClear();
  });

  it('reports online when the internet is reachable', async () => {
    mockNetworkState(true);

    const { result } = await renderHook<boolean, void>(() => useIsOffline());

    expect(result.current).toBe(false);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(true);
  });

  it('treats unknown reachability as online', async () => {
    mockNetworkState(undefined);

    const { result } = await renderHook<boolean, void>(() => useIsOffline());

    expect(result.current).toBe(false);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(true);
  });

  it('reports offline only when the internet is explicitly unreachable', async () => {
    mockNetworkState(false);

    const { result } = await renderHook<boolean, void>(() => useIsOffline());

    expect(result.current).toBe(true);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(false);
  });

  it('follows online to offline transitions', async () => {
    mockNetworkState(true);

    const { result, rerender } = await renderHook<boolean, void>(() =>
      useIsOffline(),
    );
    expect(result.current).toBe(false);

    mockNetworkState(false);
    await act(async () => {
      await rerender();
    });
    expect(result.current).toBe(true);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(false);

    mockNetworkState(true);
    await act(async () => {
      await rerender();
    });
    expect(result.current).toBe(false);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(true);
  });
});
