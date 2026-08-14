import { useAuth } from './auth-provider';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';

export type AuthRequest = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

// 登录态感知的 query 选项：登录时走 kaku 网关（private，登出即清），未登录时
// 直连 Bangumi 公开接口（persist）。queryKey 的 suffix 与 meta 都来自同一个
// session 判断，避免两处手写导致缓存串号或误持久化。
export function useSessionAwareQuery<T>(run: {
  public: (signal?: AbortSignal) => Promise<T>;
  authenticated: (request: AuthRequest, signal?: AbortSignal) => Promise<T>;
}) {
  const { request, session } = useAuth();

  return {
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      session ? run.authenticated(request, signal) : run.public(signal),
    meta: session ? { private: true } : PUBLIC_QUERY_META,
    suffix: session?.user.id ?? 'public',
  };
}
