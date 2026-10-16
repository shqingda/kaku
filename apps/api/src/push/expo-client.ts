import { z } from 'zod';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const errorTicketSchema = z.object({
  details: z.object({ error: z.string().min(1).optional() }).optional(),
  status: z.literal('error'),
});
const receiptSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok') }), errorTicketSchema,
]);
const expoPushResponseSchema = z.object({
  data: z.array(z.discriminatedUnion('status', [
    z.object({ id: z.string().min(1), status: z.literal('ok') }), errorTicketSchema,
  ])),
});

const expoReceiptsResponseSchema = z.object({ data: z.record(z.string(), receiptSchema) });

export type ExpoPushPayload = { body: string; title: string; unreadCount: number };
export type ExpoAcceptedTicket = { id: string; token: string };
export type ExpoPushResult = {
  failedTokens: { error: string; token: string }[];
  invalidTokens: string[];
  tickets: ExpoAcceptedTicket[];
};
export type ExpoPushReceipt = z.infer<typeof receiptSchema>;

function headers(accessToken?: string) {
  return { Accept: 'application/json', 'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function sendExpoPush(
  fetcher: typeof fetch,
  tokens: string[],
  payload: ExpoPushPayload,
  options: { accessToken?: string } = {},
): Promise<ExpoPushResult> {
  const result: ExpoPushResult = { failedTokens: [], invalidTokens: [], tickets: [] };
  if (tokens.length === 0) return result;
  if (tokens.length > 100) throw new Error('Expo 每批最多允许 100 个推送设备。');
  const response = await fetcher(EXPO_PUSH_URL, {
    body: JSON.stringify(tokens.map((token) => ({
      badge: payload.unreadCount, body: payload.body, data: { href: '/notifications' },
      sound: 'default', title: payload.title, to: token,
    }))),
    headers: headers(options.accessToken), method: 'POST', signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Expo 推送服务返回了 ${response.status}`);
  const parsed = expoPushResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || parsed.data.data.length !== tokens.length) {
    throw new Error('Expo 推送服务返回了无法识别的结果。');
  }
  parsed.data.data.forEach((ticket, index) => {
    const token = tokens[index]!;
    if (ticket.status === 'ok') result.tickets.push({ id: ticket.id, token });
    else if (ticket.details?.error === 'DeviceNotRegistered') result.invalidTokens.push(token);
    else result.failedTokens.push({ error: ticket.details?.error ?? 'UnknownError', token });
  });
  return result;
}

export async function getExpoPushReceipts(
  fetcher: typeof fetch,
  ticketIds: string[],
  options: { accessToken?: string } = {},
): Promise<Record<string, ExpoPushReceipt>> {
  if (ticketIds.length === 0) return {};
  if (ticketIds.length > 1000) throw new Error('Expo 每批最多允许 1000 个推送回执。');
  const response = await fetcher(EXPO_RECEIPTS_URL, {
    body: JSON.stringify({ ids: ticketIds }), headers: headers(options.accessToken),
    method: 'POST', signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Expo 推送回执服务返回了 ${response.status}`);
  const parsed = expoReceiptsResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error('Expo 推送回执服务返回了无法识别的结果。');
  return parsed.data.data;
}
