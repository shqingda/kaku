const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type ExpoPushPayload = {
  body: string;
  title: string;
  unreadCount: number;
};

type ExpoTicket = {
  details?: { error?: string };
  status?: string;
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

  const body: unknown = await response.json();
  const tickets = Array.isArray((body as { data?: unknown }).data)
    ? ((body as { data: ExpoTicket[] }).data)
    : [];

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
