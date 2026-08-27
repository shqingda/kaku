import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  exchangeHandoffCode,
  fetchKaku,
  getAppCallbackUrl,
  getBangumiLoginUrl,
  KakuApiError,
  refreshAuthSession,
} from '@/infrastructure/kaku/auth-client';
import { unregisterPushDevice } from '@/infrastructure/kaku/push-client';
import { isPrivateQuery } from '@/lib/query-persistence';
import { userErrorMessage } from '@/lib/user-error-message';

import {
  canRefreshSession,
  getHandoffCode,
  isSessionActive,
} from './auth-session';
import { authStorage } from './auth-storage';
import type { AuthSession } from './model';

type AuthSessionValue = {
  error?: string;
  isLoading: boolean;
  isSigningIn: boolean;
  session: AuthSession | null;
};

type AuthActionsValue = {
  clearError: () => void;
  completeSignIn: (callbackUrl: string) => Promise<void>;
  disconnectBangumi: () => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

// 拆成两个 context：登录状态（变化频繁）与操作函数（稳定）。只依赖 request 的
// 数据层可以用 useAuthActions，登录状态变化时不会跟着重渲染。
const AuthSessionContext = createContext<AuthSessionValue | null>(null);
const AuthActionsContext = createContext<AuthActionsValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return '登录服务响应超时，请稍后重试。';
  }

  return userErrorMessage(error, '登录没有完成，请稍后重试。');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string>();
  const handoffPromiseRef = useRef<Promise<void> | null>(null);
  const handoffCodeRef = useRef<string | undefined>(undefined);
  const refreshPromiseRef = useRef<Promise<AuthSession> | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);

  const commitSession = useCallback(async (nextSession: AuthSession) => {
    await authStorage.save(nextSession);
    sessionRef.current = nextSession;
    setSession(nextSession);
    setError(undefined);
    return nextSession;
  }, []);

  const clearSession = useCallback(async () => {
    await authStorage.clear();
    sessionRef.current = null;
    setSession(null);
  }, []);

  const refreshSession = useCallback(
    async (currentSession: AuthSession) => {
      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      const task = refreshAuthSession(currentSession.refreshToken)
        .then(commitSession)
        .catch(async (caughtError) => {
          if (caughtError instanceof KakuApiError && caughtError.status === 401) {
            await clearSession();
            setError('登录已失效，请重新登录。');
          }

          throw caughtError;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
      refreshPromiseRef.current = task;
      return task;
    },
    [clearSession, commitSession],
  );

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await authStorage.load();

        if (storedSession && isSessionActive(storedSession.expiresAt)) {
          sessionRef.current = storedSession;
          setSession(storedSession);
          return;
        }

        if (
          storedSession &&
          canRefreshSession(storedSession.refreshExpiresAt)
        ) {
          try {
            await refreshSession(storedSession);
          } catch (caughtError) {
            if (!(caughtError instanceof KakuApiError) || caughtError.status !== 401) {
              setError('登录服务暂时不可用，稍后重试即可。');
            }
          }
          return;
        }

        if (storedSession) {
          await clearSession();
        }
      } catch {
        setError('无法读取设备上的登录状态。');
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, [clearSession, refreshSession]);

  useEffect(() => {
    if (session || isLoading) return;

    queryClient.removeQueries({ predicate: isPrivateQuery });
  }, [isLoading, queryClient, session]);

  const completeSignIn = useCallback(async (callbackUrl: string) => {
    const code = getHandoffCode(callbackUrl);

    if (handoffCodeRef.current === code) {
      // The auth session and the deep-link route may deliver the same callback.
      // Reuse an in-flight exchange, or ignore it after the first one succeeds.
      return handoffPromiseRef.current ?? Promise.resolve();
    }

    handoffCodeRef.current = code;
    const deviceName = Platform.select({
      android: 'Android 设备',
      ios: 'iOS 设备',
      default: 'Kaku 设备',
    });
    const task = exchangeHandoffCode(code, deviceName)
      .then(commitSession)
      .then(() => undefined)
      .catch((caughtError) => {
        handoffCodeRef.current = undefined;
        throw caughtError;
      });
    handoffPromiseRef.current = task;

    return task.finally(() => {
      handoffPromiseRef.current = null;
    });
  }, [commitSession]);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      let currentSession = sessionRef.current;

      if (!currentSession) {
        throw new Error('请先登录 Kaku。');
      }

      if (!isSessionActive(currentSession.expiresAt, Date.now() + 60_000)) {
        currentSession = await refreshSession(currentSession);
      }

      let response = await fetchKaku(
        path,
        currentSession.sessionToken,
        init,
      );

      if (response.status === 401) {
        currentSession = await refreshSession(currentSession);
        response = await fetchKaku(path, currentSession.sessionToken, init);
      }

      return response;
    },
    [refreshSession],
  );

  const signIn = useCallback(async () => {
    if (isSigningIn) {
      return false;
    }

    setError(undefined);
    setIsSigningIn(true);

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        getBangumiLoginUrl(),
        getAppCallbackUrl(),
      );

      if (result.type === 'success') {
        await completeSignIn(result.url);
        return true;
      }

      return false;
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [completeSignIn, isSigningIn]);

  const signOut = useCallback(async () => {
    try {
      if (sessionRef.current) {
        try {
          await unregisterPushDevice(request);
        } catch {
          // 退出仍继续；下次登录会重新登记。
        }
        const response = await request('/auth/session', { method: 'DELETE' });

        if (!response.ok) {
          throw new Error('server_sign_out_failed');
        }
      }
    } catch {
      setError('本机已退出，但服务端会话暂时无法注销。');
    } finally {
      await clearSession();
    }
  }, [clearSession, request]);

  const disconnectBangumi = useCallback(async () => {
    try {
      await unregisterPushDevice(request);
    } catch {
      // 断开授权仍继续。
    }
    const response = await request('/auth/connection', { method: 'DELETE' });

    if (!response.ok) {
      throw new Error('无法断开 Bangumi，请稍后重试。');
    }

    await clearSession();
    setError(undefined);
  }, [clearSession, request]);

  const clearError = useCallback(() => setError(undefined), []);

  const sessionValue = useMemo(
    () => ({ error, isLoading, isSigningIn, session }),
    [error, isLoading, isSigningIn, session],
  );

  const actionsValue = useMemo(
    () => ({
      clearError,
      completeSignIn,
      disconnectBangumi,
      request,
      signIn,
      signOut,
    }),
    [clearError, completeSignIn, disconnectBangumi, request, signIn, signOut],
  );

  return (
    <AuthActionsContext.Provider value={actionsValue}>
      <AuthSessionContext.Provider value={sessionValue}>
        {children}
      </AuthSessionContext.Provider>
    </AuthActionsContext.Provider>
  );
}

export function useAuth() {
  const session = useContext(AuthSessionContext);
  const actions = useContext(AuthActionsContext);

  if (!session || !actions) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return { ...session, ...actions };
}

export function useAuthActions() {
  const actions = useContext(AuthActionsContext);

  if (!actions) {
    throw new Error('useAuthActions must be used inside AuthProvider');
  }

  return actions;
}
