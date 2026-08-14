import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect } from 'react';

// 基于 expo-network 的离线状态：只有明确"互联网不可达"才算离线，避免把
// "未知/正在检测"误报成离线。同时驱动 react-query 的 onlineManager，让
// 网络恢复后 refetchOnReconnect 能真正触发。
export function useIsOffline() {
  const state = Network.useNetworkState();
  const isInternetReachable = state.isInternetReachable;
  const isOffline = isInternetReachable === false;

  useEffect(() => {
    onlineManager.setOnline(isInternetReachable !== false);
  }, [isInternetReachable]);

  return isOffline;
}
