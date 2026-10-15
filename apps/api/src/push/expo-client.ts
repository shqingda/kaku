import { z } from 'zod';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const expoPushResponseSchema = z.object({
  data: z.array(z.discriminatedUnion('status', [
    z.object({ id: z.string().min(1), status: z.literal('ok') }),
    z.object({
      details: z.object({ error: z.string().min(1).optional() }).optional(),
      status: z.literal('error'),
    }),
  ])),
});

export type ExpoPushPayload = {
  body: string;
  title: string;
  unreadCount: number;
};

export async function sendExpoPush(
  fetcher: typeof fetch,
  tokens: string[],
  payload: ExpoPushPayload,
  options: { accessToken?: string } = {},
): Promise<string[]> {
  if (tokens.length === 0) {
    return [];
  }

  const response = await fetcher(EXPO_PUSH_URL, {
    body: JSON.stringify(
      tokens.map((token) => ({
        badge: payload.unreadCount,
        body: payload.body,
        data: { href: '/notifications' },
        sound: 'default',
        title: payload.title,
        to: token,
      })),
    ),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {}),
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Expo 推送服务返回了 ${response.status}`);
  }

  const parsed = expoPushResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success || parsed.data.data.length !== tokens.length) {
    throw new Error('Expo 推送服务返回了无法识别的结果。');
  }
  const tickets = parsed.data.data;

  const invalidTokens: string[] = [];
  let misconfigured: string | null = null;
  tickets.forEach((ticket, index) => {
    if (ticket.status !== 'error') {
      return;
    }
    const reason = ticket.details?.error ?? 'UnknownError';
    if (reason === 'DeviceNotRegistered') {
      const token = tokens[index];
      if (token) invalidTokens.push(token);
    } else {
      // 401 Unauthorized（缺 access token）/ InvalidCredentials（未配 FCM v1）等整批发送失败。
      misconfigured = reason;
    }
  });

  if (misconfigured) {
    throw new Error(`Expo 推送被拒（${misconfigured}），请检查 EXPO_ACCESS_TOKEN 与 FCM v1 凭据。`);
  }

  return invalidTokens;
}
