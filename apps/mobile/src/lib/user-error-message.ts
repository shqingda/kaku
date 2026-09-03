import { KakuApiError } from '../infrastructure/kaku/auth-client.ts';
import { BangumiRequestError } from '../infrastructure/bangumi/transport/http-client.ts';

const FALLBACK_MESSAGE = '暂时没有成功，请稍后重试。';

export function userErrorMessage(error: unknown, fallback = FALLBACK_MESSAGE) {
  if (error instanceof KakuApiError) {
    switch (error.status) {
      case 401:
        return '登录已失效，请重新登录。';
      case 403:
        return '没有权限执行这个操作。';
      case 404:
        return '内容不存在或已删除。';
      case 429:
        return '请求太频繁，请稍后再试。';
    }
    if (error.status >= 500) {
      return '服务暂时不可用，请稍后重试。';
    }
    return fallback;
  }

  if (error instanceof BangumiRequestError) {
    if (error.status === 429) {
      return '请求太频繁，请稍后再试。';
    }
    if (error.status && error.status >= 500) {
      return 'Bangumi 服务暂时不可用，请稍后重试。';
    }
    if (error.status) {
      return `Bangumi 返回了 ${error.status}，请稍后重试。`;
    }
    return 'Bangumi 没有响应，请稍后重试。';
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return '请求超时，请检查网络后重试。';
  }

  if (error instanceof TypeError) {
    return '网络连接失败，请检查网络后重试。';
  }

  return fallback;
}