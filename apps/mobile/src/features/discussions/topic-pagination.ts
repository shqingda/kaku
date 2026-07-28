export function getNextTopicOffset(
  offset: number,
  loadedCount: number,
  total: number,
) {
  if (loadedCount <= 0) {
    return undefined;
  }

  const nextOffset = offset + loadedCount;
  return nextOffset < total ? nextOffset : undefined;
}
