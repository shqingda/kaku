import { z } from 'zod';

import { readErrorMessage } from './auth-client';

const friendshipSchema = z.object({ isFriend: z.boolean() });
const blocklistSchema = z.object({
  blocklist: z.array(z.number().int().positive()).default([]),
});

export async function getUserFriendship(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  username: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await request(
    `/me/users/${encodeURIComponent(username)}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return friendshipSchema.parse(await response.json()).isFriend;
}

export async function getBlocklist(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  signal?: AbortSignal,
): Promise<number[]> {
  const response = await request('/me/blocklist', { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return blocklistSchema.parse(await response.json()).blocklist;
}

export async function setUserBlocked(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  username: string,
  shouldBlock: boolean,
): Promise<number[]> {
  const response = await request(
    `/me/blocklist/${encodeURIComponent(username)}`,
    { method: shouldBlock ? 'PUT' : 'DELETE' },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return blocklistSchema.parse(await response.json()).blocklist;
}

export async function setUserFriend(
  request: (path: string, init?: RequestInit) => Promise<Response>,
  username: string,
  shouldAdd: boolean,
): Promise<boolean> {
  const response = await request(
    `/me/friends/${encodeURIComponent(username)}`,
    {
      headers: { 'Content-Type': 'application/json' },
      method: shouldAdd ? 'PUT' : 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return friendshipSchema.parse(await response.json()).isFriend;
}
