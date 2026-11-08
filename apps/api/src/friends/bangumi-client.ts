import { z } from 'zod';

import { BANGUMI_USER_AGENT } from '../bangumi-request.ts';

const BANGUMI_PRIVATE_API_URL = 'https://next.bgm.tv/p1';

export class BangumiFriendsError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BangumiFriendsError';
    this.status = status;
  }
}

// P1 用户资料中只有 isFriend 是 Kaku 需要的；其余字段一律不读取。
const bangumiUserFriendshipSchema = z.object({
  isFriend: z.boolean().default(false),
});

function friendsErrorMessage(status: number) {
  if (status === 404) {
    return '没有找到这个用户。';
  }
  if (status === 429) {
    return '操作太频繁了，请稍后再试。';
  }
  if (status >= 500) {
    return 'Bangumi 暂时不可用，请稍后重试。';
  }
  return '好友操作没有完成，请稍后重试。';
}

export async function getBangumiUserFriendship({
  accessToken,
  fetcher = fetch,
  username,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  username: string;
}): Promise<{ isFriend: boolean }> {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/users/${encodeURIComponent(username)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': BANGUMI_USER_AGENT,
      },
    },
  );

  if (!response.ok) {
    throw new BangumiFriendsError(
      response.status,
      friendsErrorMessage(response.status),
    );
  }

  const profile = bangumiUserFriendshipSchema.parse(await response.json());
  return { isFriend: profile.isFriend };
}

// 添加/删除好友：官方 P1 接口为 PUT 与 DELETE，均返回空对象。
export async function setBangumiFriend({
  accessToken,
  fetcher = fetch,
  shouldAdd,
  username,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  shouldAdd: boolean;
  username: string;
}): Promise<boolean> {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/friends/${encodeURIComponent(username)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': BANGUMI_USER_AGENT,
      },
      method: shouldAdd ? 'PUT' : 'DELETE',
    },
  );

  if (!response.ok) {
    throw new BangumiFriendsError(
      response.status,
      friendsErrorMessage(response.status),
    );
  }

  return shouldAdd;
}

const bangumiBlocklistSchema = z.object({
  blocklist: z.array(z.number().int().positive()).default([]),
});

// 屏蔽列表返回被屏蔽用户的 ID（数字）。
export async function getBangumiBlocklist({
  accessToken,
  fetcher = fetch,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
}): Promise<{ blocklist: number[] }> {
  const response = await fetcher(`${BANGUMI_PRIVATE_API_URL}/blocklist`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': BANGUMI_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new BangumiFriendsError(
      response.status,
      friendsErrorMessage(response.status),
    );
  }

  return bangumiBlocklistSchema.parse(await response.json());
}

// 诊断用：上游 5xx 时记录状态码与错误内容，便于定位 Bangumi 侧故障。
// 不记录 token；正文中出现的目标用户名替换为占位符，正文最多保留 500 字。
async function logUpstreamFailure(
  action: string,
  response: Response,
  username?: string,
) {
  if (response.status < 500) return;
  let body = '';
  try {
    body = (await response.text()).slice(0, 500);
  } catch {
    body = '<unreadable>';
  }
  if (username) body = body.split(username).join('<user>');
  console.error(
    JSON.stringify({
      action,
      body,
      event: 'bangumi_relationship_upstream_error',
      status: response.status,
    }),
  );
}

// 屏蔽/取消屏蔽：PUT 加入、DELETE 移除，均返回更新后的屏蔽列表。
export async function setBangumiBlocked({
  accessToken,
  fetcher = fetch,
  shouldBlock,
  username,
}: {
  accessToken: string;
  fetcher?: typeof fetch;
  shouldBlock: boolean;
  username: string;
}): Promise<{ blocklist: number[] }> {
  const response = await fetcher(
    `${BANGUMI_PRIVATE_API_URL}/blocklist/${encodeURIComponent(username)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': BANGUMI_USER_AGENT,
      },
      method: shouldBlock ? 'PUT' : 'DELETE',
    },
  );

  if (!response.ok) {
    await logUpstreamFailure(
      shouldBlock ? 'block' : 'unblock',
      response,
      username,
    );
    throw new BangumiFriendsError(
      response.status,
      friendsErrorMessage(response.status),
    );
  }

  return bangumiBlocklistSchema.parse(await response.json());
}
