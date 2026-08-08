export function getRemainingPageOffsets(total: number, pageSize: number) {
  const pageCount = Math.max(0, Math.ceil(total / pageSize) - 1);
  return Array.from(
    { length: pageCount },
    (_, index) => (index + 1) * pageSize,
  );
}
