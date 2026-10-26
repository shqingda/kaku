import { z } from 'zod';

// Tokens are opaque; cap length and reject legacy envelopes, whitespace and paths.
const nativePushTokenSchema = z.string().min(20).max(4096).regex(/^[A-Za-z0-9_:\-]+$/);
export const pushTokenSchema = z.union([
  nativePushTokenSchema,
  z.string().max(4096).regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]\s]+\]$/),
]);
export const pushRegistrationSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('fcm'), platform: z.literal('android'), token: nativePushTokenSchema }),
  z.object({ provider: z.literal('apns'), platform: z.literal('ios'),
    token: z.string().min(32).max(512).regex(/^[a-fA-F0-9]+$/),
    apnsEnvironment: z.enum(['sandbox', 'production']),
    apnsTopic: z.enum(['com.shqingda.kaku', 'com.shqingda.kaku.debug']),
  }),
]);
export type PushRegistration = z.infer<typeof pushRegistrationSchema>;
