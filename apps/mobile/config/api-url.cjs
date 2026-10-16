exports.resolveApiUrl = function resolveApiUrl(value, production = false) {
  if (!value || value.trim() !== value) {
    throw new Error('请显式设置 EXPO_PUBLIC_KAKU_API_URL，参照 apps/mobile/.env.example。');
  }
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback && !production))) {
    throw new Error('Kaku API 必须使用 HTTPS origin；本机开发可显式使用 loopback HTTP。');
  }
  return url.origin;
};
