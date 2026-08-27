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
  tickets.forEach((ticket, index) => {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      const token = tokens[index];
      if (token) invalidTokens.push(token);
    }
  });

  return invalidTokens;
}
