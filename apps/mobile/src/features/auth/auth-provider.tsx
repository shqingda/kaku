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

import {
  exchangeHandoffCode,
  getAppCallbackUrl,
  getBangumiLoginUrl,
} from '@/infrastructure/kaku/auth-client';

import { getHandoffCode, isSessionActive } from './auth-session';
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

  useEffect(() => {
    void authStorage
      .load()
      .then(async (storedSession) => {
        if (storedSession && isSessionActive(storedSession.expiresAt)) {
          setSession(storedSession);
          return;
        }

        if (storedSession) {
          await authStorage.clear();
        }
      })
      .catch(() => setError('无法读取设备上的登录状态。'))
      .finally(() => setIsLoading(false));
  }, []);

  const completeSignIn = useCallback(async (callbackUrl: string) => {
    const code = getHandoffCode(callbackUrl);

    if (handoffCodeRef.current === code) {
      // The auth session and the deep-link route may deliver the same callback.
      // Reuse an in-flight exchange, or ignore it after the first one succeeds.
      return handoffPromiseRef.current ?? Promise.resolve();
    }

    handoffCodeRef.current = code;
    const task = exchangeHandoffCode(code)
      .then(async (nextSession) => {
        await authStorage.save(nextSession);
        setSession(nextSession);
        setError(undefined);
      })
      .catch((caughtError) => {
        handoffCodeRef.current = undefined;
        throw caughtError;
      });
    handoffPromiseRef.current = task;

    return task.finally(() => {
      handoffPromiseRef.current = null;
    });
  }, []);

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
    await authStorage.clear();
    setSession(null);
    setError(undefined);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        clearError: () => setError(undefined),
        completeSignIn,
        error,
        isLoading,
        isSigningIn,
        session,
        signIn,
        signOut,
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
