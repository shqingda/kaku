import { z } from 'zod';

const authUserSchema = z.object({
  avatarUrl: z.string().optional(),
  id: z.number().int().positive(),
  nickname: z.string(),
  username: z.string().min(1),
});

export const authSessionSchema = z.object({
  expiresAt: z.number().int().positive(),
  sessionToken: z.string().min(20),
  user: authUserSchema,
});

export function getHandoffCode(callbackUrl: string) {
  const code = new URL(callbackUrl).searchParams.get('code');

  if (!code || code.length < 20) {
    throw new Error('Bangumi 没有返回有效的登录信息。');
  }

  return code;
}

export function isSessionActive(expiresAt: number, now = Date.now()) {
  return expiresAt > now;
}
