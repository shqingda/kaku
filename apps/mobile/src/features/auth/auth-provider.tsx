import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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

import {
  canRefreshSession,
  getHandoffCode,
  isSessionActive,
} from './auth-session';
import { authStorage } from './auth-storage';
import type { AuthSession } from './model';

type AuthContextValue = {
  error?: string;
  isLoading: boolean;
  isSigningIn: boolean;
  session: AuthSession | null;
  clearError: () => void;
  completeSignIn: (callbackUrl: string) => Promise<void>;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  disconnectBangumi: () => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError') {
      return '登录服务响应超时，请稍后重试。';
    }

    return error.message;
  }

  return '登录没有完成，请稍后重试。';
}

export function AuthProvider({ children }: { children: ReactNode }) {
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
    const response = await request('/auth/connection', { method: 'DELETE' });

    if (!response.ok) {
      throw new Error('无法断开 Bangumi，请稍后重试。');
    }

    await clearSession();
    setError(undefined);
  }, [clearSession, request]);

  return (
    <AuthContext.Provider
      value={{
        clearError: () => setError(undefined),
        completeSignIn,
        disconnectBangumi,
        error,
        isLoading,
        isSigningIn,
        session,
        signIn,
        signOut,
        request,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
