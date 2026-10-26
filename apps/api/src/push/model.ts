export type PushPayload = { body: string; title: string; unreadCount: number };
// Acceptance by FCM/APNs is not proof of delivery to the phone.
type PushAcceptance = { id: string; token: string };
export type PushResult = {
  failedTokens: { error: string; token: string }[];
  invalidTokens: string[];
  tickets: PushAcceptance[];
};
export type SendResult =
  | { status: 'accepted'; id: string }
  | { status: 'invalid' }
  | { status: 'failed'; error: string };
