import { redirectTurnstileSystemPath } from '../features/auth/turnstile-callback';

export function redirectSystemPath({ path }: { initial: boolean; path: string }) {
  // openAuthSessionAsync consumes this one-time callback. Expo Router must not
  // also navigate to it, otherwise the preserved composer is replaced by an
  // unmatched `/auth/turnstile` screen.
  return redirectTurnstileSystemPath(path);
}
