import { getTurnstileTokenFromCallback, isTurnstileCallbackUrl } from './turnstile-callback.ts';

// Load Bangumi's real HTTPS page: never emulate its origin with local HTML.
export const TURNSTILE_PAGE_URL = 'https://next.bgm.tv/p1/turnstile?redirect_uri=kaku%3A%2F%2Fauth%2Fturnstile&theme=auto';

// Cloudflare's standard widget is 300 × 65 pt.
export const TURNSTILE_WIDGET_HEIGHT = 65;

function isTurnstilePage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.origin === 'https://next.bgm.tv' && parsed.pathname === '/p1/turnstile';
  } catch { return false; }
}

export function allowTurnstileNavigation(url: string, isTopFrame: boolean) {
  if (isTurnstilePage(url)) return true;
  if (isTopFrame) return false;
  if (url === 'about:blank' || url === 'about:srcdoc') return true;
  try { return new URL(url).origin === 'https://challenges.cloudflare.com'; }
  catch { return false; }
}

// The official page renders Cloudflare's widget and, once the user passes,
// navigates to kaku://auth/turnstile?token=…. The WebView stops that
// navigation and hands the token to the app.
export function turnstileTokenFromRedirect(url: string) {
  if (!isTurnstileCallbackUrl(url)) return null;
  try {
    const token = getTurnstileTokenFromCallback(url);
    return token.length <= 2048 ? token : null;
  } catch { return null; }
}

// Presentation only: strip the page down to the centred widget on a
// transparent background so it sits inside Kaku's own card. The page's
// script, sitekey and callback stay untouched.
export const TURNSTILE_BRIDGE = `
(function () {
  if (window.location.origin !== 'https://next.bgm.tv' || window.location.pathname !== '/p1/turnstile' || window.__kakuTurnstile) return;
  window.__kakuTurnstile = true;
  var root = document.head || document.documentElement;
  var viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  root.appendChild(viewport);
  var style = document.createElement('style');
  style.textContent = 'html,body{margin:unset;padding:unset;background:transparent!important;overflow:hidden;}' +
    'body>*:not(#turnstile-container):not(script){display:none!important;}' +
    '#turnstile-container{display:flex;justify-content:center;align-items:center;min-height:${TURNSTILE_WIDGET_HEIGHT}px;}';
  root.appendChild(style);
})();
true;
`;
