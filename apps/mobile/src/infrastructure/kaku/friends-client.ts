import { z } from 'zod';

import { readErrorMessage } from './auth-client';

const friendshipSchema = z.object({ isFriend: z.boolean() });

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
