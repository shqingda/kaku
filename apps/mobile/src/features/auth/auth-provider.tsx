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
import { getLoginDevice } from './login-device';

import {
  exchangeHandoffCode,
  fetchKaku,
  getAppCallbackUrl,
  getBangumiLoginUrl,
  KakuApiError,
  isReauthorizationResponse,
  refreshAuthSession,
} from '@/infrastructure/kaku/auth-client';
import { unregisterPushDevice } from '@/features/push/device-registration';
import { isPrivateQuery } from '@/lib/query-persistence';
import { userErrorMessage } from '@/lib/user-error-message';

import {
  canRefreshSession,
  isSessionActive,
} from './auth-session';
import { authStorage } from './auth-storage';
import { getHandoffCallback, parsePendingLogin, type PendingLogin } from './login-attempt';
import { createLoginProof, loginAttemptStorage } from './login-proof';
import { AuthSessionChangedError, type AuthRequestScope } from './auth-request-scope';
export { AuthSessionChangedError, type AuthRequestIdentity, type AuthRequestScope } from './auth-request-scope';
import type { AuthSession } from './model';

type AuthSessionValue = {
  authEpoch: number;
  error?: string;
  isLoading: boolean;
  isSigningIn: boolean;
  session: AuthSession | null;
};

type AuthActionsValue = {
  captureRequest: () => AuthRequestScope;
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
  const [authEpoch, setAuthEpoch] = useState(0);
  const authEpochRef = useRef(0);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string>();
  const handoffPromiseRef = useRef<Promise<void> | null>(null);
  const handoffCodeRef = useRef<string | undefined>(undefined);
  const pendingLoginRef = useRef<PendingLogin | null>(null);
  const pendingLoginLoadRef = useRef<Promise<void> | null>(null);
  const signingInRef = useRef(false);
  const sessionAbortRef = useRef(new AbortController());
  const refreshPromiseRef = useRef<{ session: AuthSession; task: Promise<AuthSession> } | null>(null);
  const storageWriteRef = useRef<Promise<void>>(Promise.resolve());
  const sessionVersionRef = useRef(0);
  const sessionRef = useRef<AuthSession | null>(null);

  // SecureStore writes must retain the same order as session changes.
  const persistSession = useCallback((next: AuthSession | null, version: number) => {
    const task = storageWriteRef.current.catch(() => undefined).then(() => {
      if (sessionVersionRef.current !== version) throw new AuthSessionChangedError();
      return next ? authStorage.save(next) : authStorage.clear();
    });
    storageWriteRef.current = task;
    return task;
  }, []);

  const invalidateIdentity = useCallback(() => {
    authEpochRef.current += 1;
    setAuthEpoch(authEpochRef.current);
    sessionAbortRef.current.abort();
    sessionAbortRef.current = new AbortController();
    // Removing queries also cancels their retryers; old optimistic values cannot
    // survive into another login when its mutation callbacks are now invalid.
    queryClient.removeQueries({ predicate: isPrivateQuery });
  }, [queryClient]);

  const commitSession = useCallback(async (
    nextSession: AuthSession,
    version: number,
    replaceIdentity = false,
  ) => {
    if (sessionVersionRef.current !== version) throw new AuthSessionChangedError();
    const identityChanges = replaceIdentity || sessionRef.current?.sessionId !== nextSession.sessionId ||
      sessionRef.current?.user.id !== nextSession.user.id;
    // Invalidate refreshes started while the handoff was pending before the new
    // session enters the serialized storage queue. Token rotation keeps its owner.
    const commitVersion = identityChanges ? ++sessionVersionRef.current : version;
    await persistSession(nextSession, commitVersion);
    if (sessionVersionRef.current !== commitVersion) throw new AuthSessionChangedError();
    if (identityChanges) invalidateIdentity();
    sessionRef.current = nextSession;
    setSession(nextSession);
    setError(undefined);
    return nextSession;
  }, [invalidateIdentity, persistSession]);

  const clearSession = useCallback(async () => {
    const version = ++sessionVersionRef.current;
    invalidateIdentity();
    sessionRef.current = null;
    setSession(null);
    await persistSession(null, version);
  }, [invalidateIdentity, persistSession]);

  const refreshSession = useCallback(
    async (currentSession: AuthSession) => {
      const latest = sessionRef.current;
      if (!latest || latest.sessionId !== currentSession.sessionId) {
        throw new Error('登录状态已变化，请重试。');
      }
      // Another request may already have rotated these credentials.
      if (latest.refreshToken !== currentSession.refreshToken) return latest;
      const pending = refreshPromiseRef.current;
      if (pending && pending.session === currentSession) return pending.task;
      const version = sessionVersionRef.current;
      const task = refreshAuthSession(currentSession.refreshToken)
        .then((next) => commitSession(next, version))
        .catch(async (caughtError) => {
          if (
            sessionVersionRef.current === version &&
            sessionRef.current === currentSession &&
            caughtError instanceof KakuApiError && caughtError.status === 401
          ) {
            await clearSession();
            if (sessionVersionRef.current === version + 1 && !sessionRef.current) {
              setError('登录已失效，请重新登录。');
            }
          }
          throw caughtError;
        })
        .finally(() => {
          if (refreshPromiseRef.current?.task === task) refreshPromiseRef.current = null;
        });
      refreshPromiseRef.current = { session: currentSession, task };
      return task;
    },
    [clearSession, commitSession],
  );

  useEffect(() => {
    const version = sessionVersionRef.current;
    async function restoreSession() {
      try {
        const storedSession = await authStorage.load();
        if (sessionVersionRef.current !== version) return;

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
            sessionRef.current = storedSession;
            await refreshSession(storedSession);
          } catch (caughtError) {
            if (sessionVersionRef.current === version && (!(caughtError instanceof KakuApiError) || caughtError.status !== 401)) {
              setError('登录服务暂时不可用，稍后重试即可。');
            }
          }
          return;
        }

        if (storedSession) {
          await clearSession();
        }
      } catch {
        if (sessionVersionRef.current === version) setError('无法读取设备上的登录状态。');
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

  const loadPendingLogin = useCallback(() => {
    if (!pendingLoginLoadRef.current) {
      pendingLoginLoadRef.current = loginAttemptStorage.load().then((pending) => {
        pendingLoginRef.current = pending;
      }).catch((caughtError) => {
        pendingLoginLoadRef.current = null;
        throw caughtError;
      });
    }
    return pendingLoginLoadRef.current;
  }, []);

  const clearPendingLogin = useCallback(async (pending: PendingLogin) => {
    if (pendingLoginRef.current !== pending) return;
    pendingLoginRef.current = null;
    await loginAttemptStorage.clear();
  }, []);

  const completeSignIn = useCallback(async (callbackUrl: string) => {
    const { code, requestId } = getHandoffCallback(callbackUrl);
    const callbackKey = `${requestId}:${code}`;
    if (handoffCodeRef.current === callbackKey) return handoffPromiseRef.current ?? Promise.resolve();
    await loadPendingLogin();
    if (handoffCodeRef.current === callbackKey) return handoffPromiseRef.current ?? Promise.resolve();
    if (handoffPromiseRef.current) throw new Error('正在完成其他登录回调，请稍后重试。');
    const pending = pendingLoginRef.current;
    if (!pending || pending.requestId !== requestId || !parsePendingLogin(JSON.stringify(pending))) {
      throw new Error('本机没有匹配的登录请求，请重新发起登录。');
    }

    handoffCodeRef.current = callbackKey;
    const version = sessionVersionRef.current;
    const task = getLoginDevice()
      .then(device => exchangeHandoffCode({ code, codeVerifier: pending.codeVerifier, requestId, ...device }))
      .then((next) => commitSession(next, version, true))
      .then(() => undefined)
      .finally(() => clearPendingLogin(pending));
    handoffPromiseRef.current = task;
    try {
      await task;
    } catch (caughtError) {
      if (handoffCodeRef.current === callbackKey) handoffCodeRef.current = undefined;
      throw caughtError;
    } finally {
      if (handoffPromiseRef.current === task) handoffPromiseRef.current = null;
    }
  }, [clearPendingLogin, commitSession, loadPendingLogin]);

  const captureRequest = useCallback((): AuthRequestScope => {
    const originalSession = sessionRef.current;
    if (!originalSession) throw new Error('请先登录 Kaku。');
    const identity = { userId: originalSession.user.id, sessionId: originalSession.sessionId, authEpoch: authEpochRef.current };
    const sessionSignal = sessionAbortRef.current.signal;
    const isCurrent = () => authEpochRef.current === identity.authEpoch &&
      sessionRef.current?.sessionId === identity.sessionId && sessionRef.current?.user.id === identity.userId;
    const assertCurrent = () => { if (!isCurrent()) throw new AuthSessionChangedError(); };
    const scopedRequest = async (path: string, init?: RequestInit) => {
      assertCurrent();
      const controller = new AbortController();
      const abort = () => controller.abort();
      const signals = [sessionSignal, init?.signal];
      for (const signal of signals) {
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
      }
      try {
        let currentSession = sessionRef.current!;
        if (!isSessionActive(currentSession.expiresAt, Date.now() + 60_000)) {
          currentSession = await refreshSession(currentSession);
          assertCurrent();
        }
        const options = { ...init, signal: controller.signal };
        let response = await fetchKaku(path, currentSession.sessionToken, options);
        assertCurrent();
        if (response.status === 401) {
          currentSession = await refreshSession(currentSession);
          assertCurrent();
          response = await fetchKaku(path, currentSession.sessionToken, options);
          assertCurrent();
        }
        const reauthorizationRequired = await isReauthorizationResponse(response);
        assertCurrent();
        if (reauthorizationRequired) {
          await clearSession();
          if (authEpochRef.current === identity.authEpoch + 1 && !sessionRef.current) {
            setError('Bangumi 授权已失效，请重新登录。');
          }
        }
        return response;
      } catch (caughtError) {
        assertCurrent();
        throw caughtError;
      } finally {
        for (const signal of signals) signal?.removeEventListener('abort', abort);
      }
    };
    return { identity, isCurrent, request: scopedRequest };
  }, [clearSession, refreshSession]);

  const request = useCallback((path: string, init?: RequestInit) => captureRequest().request(path, init), [captureRequest]);

  const signIn = useCallback(async () => {
    if (signingInRef.current) return false;
    signingInRef.current = true;
    setError(undefined);
    setIsSigningIn(true);
    let pending: PendingLogin | undefined;
    const previousSession = sessionRef.current;
    const previousVersion = sessionVersionRef.current;
    const previousAuthEpoch = authEpochRef.current;
    try {
      await loadPendingLogin();
      const proof = await createLoginProof();
      if (sessionVersionRef.current !== previousVersion) throw new AuthSessionChangedError();
      pending = proof.pending;
      pendingLoginRef.current = pending;
      await loginAttemptStorage.save(pending);
      const result = await WebBrowser.openAuthSessionAsync(
        getBangumiLoginUrl({ codeChallenge: proof.codeChallenge, requestId: pending.requestId }),
        getAppCallbackUrl(),
      );
      if (result.type === 'success') {
        await completeSignIn(result.url);
        return true;
      }
      return false;
    } catch (caughtError) {
      if (sessionRef.current === previousSession && authEpochRef.current === previousAuthEpoch) {
        setError(getErrorMessage(caughtError));
      }
      return false;
    } finally {
      if (pending) await clearPendingLogin(pending);
      signingInRef.current = false;
      setIsSigningIn(false);
    }
  }, [clearPendingLogin, completeSignIn, loadPendingLogin]);

  const signOut = useCallback(async () => {
    if (!sessionRef.current) return;
    const scope = captureRequest();
    try {
      try {
        await unregisterPushDevice(scope.request);
      } catch {
        // A failed unregister must not prevent this device from signing out.
      }
      if (!scope.isCurrent()) return;
      const response = await scope.request('/auth/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('server_sign_out_failed');
    } catch {
      if (scope.isCurrent()) setError('本机已退出，但服务端会话暂时无法注销。');
    } finally {
      if (scope.isCurrent()) await clearSession();
    }
  }, [captureRequest, clearSession]);

  const disconnectBangumi = useCallback(async () => {
    const scope = captureRequest();
    try {
      await unregisterPushDevice(scope.request);
    } catch {
      // An unavailable push service must not prevent revoking the connection.
    }
    if (!scope.isCurrent()) throw new AuthSessionChangedError();
    const response = await scope.request('/auth/connection', { method: 'DELETE' });
    if (!response.ok) throw new Error('无法断开 Bangumi，请稍后重试。');
    if (!scope.isCurrent()) throw new AuthSessionChangedError();
    setError(undefined);
    await clearSession();
  }, [captureRequest, clearSession]);

  const clearError = useCallback(() => setError(undefined), []);

  const sessionValue = useMemo(
    () => ({ authEpoch, error, isLoading, isSigningIn, session }),
    [authEpoch, error, isLoading, isSigningIn, session],
  );

  const actionsValue = useMemo(
    () => ({
      captureRequest,
      clearError,
      completeSignIn,
      disconnectBangumi,
      request,
      signIn,
      signOut,
    }),
    [captureRequest, clearError, completeSignIn, disconnectBangumi, request, signIn, signOut],
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
