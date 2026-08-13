const MAX_DIAGNOSTIC_TEXT_LENGTH = 6_000;

export function sanitizeDiagnosticText(value: unknown, maxLength = MAX_DIAGNOSTIC_TEXT_LENGTH) {
  const text = typeof value === 'string' ? value : String(value ?? '');

  return text
    .replace(/\/Users\/[^/\s]+/g, '/Users/[USER]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /((?:access|refresh|session)[_-]?token|client[_-]?secret)\s*[:=]\s*["']?[^\s,"'}]+/gi,
      '$1=[REDACTED]',
    )
    .replace(
      /([?&](?:code|state|token|access_token|refresh_token)=)[^&#\s]+/gi,
      '$1[REDACTED]',
    )
    .slice(0, Math.max(0, maxLength));
}
