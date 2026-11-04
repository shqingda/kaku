// Cloudflare Turnstile tokens are single-use and expire after 300 seconds.
// Leave a margin for the request to reach Bangumi.
const TURNSTILE_TOKEN_MAX_AGE_MS = 240_000;

export const VERIFICATION_LIMITS = {
  // A quiet prefetch while the user writes; failure only means the
  // check runs again when they publish.
  background: 90_000,
  // After 发布 is tapped. Mainland networks reach Cloudflare slowly, so the
  // automatic check gets more than the previous 30 seconds.
  automatic: 60_000,
  // The user is solving a visible challenge.
  interactive: 120_000,
} as const;

export function isTurnstileTokenFresh(obtainedAt: number, now: number) {
  return now - obtainedAt < TURNSTILE_TOKEN_MAX_AGE_MS;
}
