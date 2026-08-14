import type { Context } from 'hono';

import type { Env } from '../env.ts';
import { BangumiOAuthError } from './bangumi-client.ts';
import { BangumiReauthorizationRequiredError } from './bangumi-token-service.ts';
import { createD1AuthStore } from './store.ts';
import type { AuthStore } from './store.ts';

// 鉴权路由共享的两段样板：store 的创建（测试注入 / 生产 D1）与 OAuth /
// 重新授权两类共有错误的 HTTP 映射。各 feature 自身的上游错误映射并不相同，
// 仍留在各自 routes.ts 里。
export function getAuthStore(
  env: Env,
  createStore?: (database: D1Database) => AuthStore,
): AuthStore {
  return createStore ? createStore(env.DB) : createD1AuthStore(env.DB);
}

export function mapBangumiAuthError(
  context: Context<{ Bindings: Env }>,
  error: unknown,
): Response | null {
  if (error instanceof BangumiReauthorizationRequiredError) {
    return context.json(
      { error: 'bangumi_reauthorization_required', message: error.message },
      409,
    );
  }

  if (error instanceof BangumiOAuthError) {
    return context.json(
      {
        error: 'bangumi_oauth_unavailable',
        message: 'Bangumi 登录服务暂时不可用，请稍后重试。',
      },
      503,
    );
  }

  return null;
}
