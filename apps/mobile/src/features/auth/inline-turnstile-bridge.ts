// Load Bangumi's real HTTPS page: never emulate its origin with local HTML.
export const TURNSTILE_PAGE_URL = 'https://next.bgm.tv/p1/turnstile?redirect_uri=kaku%3A%2F%2Fauth%2Fturnstile&theme=auto';

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

type TurnstileMessage = { type: 'token'; token: string } | { type: 'interactive' | 'error' | 'expired' | 'timeout' };
export function parseTurnstileMessage(url: string, data: string): TurnstileMessage | null {
  if (!isTurnstilePage(url) || data.length > 4096) return null;
  try {
    const value = JSON.parse(data);
    if (!value || typeof value !== 'object') return null;
    if (value.type === 'token' && typeof value.token === 'string' && value.token.length > 0 && value.token.length <= 2048) {
      return { type: 'token', token: value.token };
    }
    if (['interactive', 'error', 'expired', 'timeout'].includes(value.type)) return { type: value.type };
  } catch { /* Ignore messages outside the small bridge contract. */ }
  return null;
}

// The official page renders in window.onload. Preserve its sitekey/theme and
// augment that render with Cloudflare's documented callbacks. Document-end
// injection normally precedes load; late Android injection re-renders once.
// If Bangumi changes this contract, fail explicitly and retain the draft.
export const TURNSTILE_BRIDGE = `
(function () {
  if (window.location.origin !== 'https://next.bgm.tv' || window.location.pathname !== '/p1/turnstile' || window.__kakuTurnstile) return;
  window.__kakuTurnstile = true;
  function notify(type, token) {
    window.ReactNativeWebView.postMessage(JSON.stringify(token ? { type: type, token: token } : { type: type }));
  }
  var viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  document.head.appendChild(viewport);
  var load = window.onload;
  if (typeof load !== 'function') { notify('error'); return; }
  window.onload = function () {
    var api = window.turnstile;
    if (!api) { notify('error'); return; }
    var render = api.render;
    api.render = function (container, options) {
      return render.call(api, container, Object.assign({}, options, {
        appearance: 'interaction-only',
        retry: 'never',
        'refresh-expired': 'never',
        'refresh-timeout': 'never',
        callback: function (token) { notify('token', token); },
        'before-interactive-callback': function () { notify('interactive'); },
        'error-callback': function () { notify('error'); return true; },
        'expired-callback': function () { notify('expired'); },
        'timeout-callback': function () { notify('timeout'); }
      }));
    };
    try { load.call(window); }
    catch (_) { notify('error'); }
    finally { api.render = render; }
  };
  if (document.readyState === 'complete') {
    try { if (window.turnstile) window.turnstile.remove(); } catch (_) {}
    window.onload();
  }
})();
true;
`;
