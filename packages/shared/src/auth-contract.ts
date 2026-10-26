import { z } from 'zod';

export const loginRequestIdSchema = z.uuid();
export const codeVerifierSchema = z.string().min(43).max(128).regex(/^[A-Za-z0-9._~-]+$/);
export const codeChallengeSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const handoffStartQuerySchema = z.object({
  app_redirect_uri: z.literal('kaku://auth/callback').optional(),
  code_challenge: codeChallengeSchema,
  code_challenge_method: z.literal('S256'),
  request_id: loginRequestIdSchema,
});

export const handoffSessionRequestSchema = z.object({
  code: z.string().min(20),
  codeVerifier: codeVerifierSchema,
  deviceName: z.string().trim().min(1).max(80).default('未知设备'),
  requestId: loginRequestIdSchema,
});

export const authSessionSchema = z.object({
  expiresAt: z.number().int().positive(),
  refreshExpiresAt: z.number().int().positive(),
  refreshToken: z.string().min(20),
  sessionId: z.string().min(1),
  sessionToken: z.string().min(20),
  user: z.object({
    avatarUrl: z.string().optional(),
    id: z.number().int().positive(),
    nickname: z.string(),
    username: z.string().min(1),
  }),
});

export type HandoffSessionRequest = z.infer<typeof handoffSessionRequestSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionSchema>;
