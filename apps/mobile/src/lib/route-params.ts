export function parsePositiveIntegerRouteParam(value?: string) {
  if (!value || !/^\d+$/.test(value)) return undefined;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}
