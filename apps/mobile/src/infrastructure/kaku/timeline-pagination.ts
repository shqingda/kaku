export function getFriendTimelinePath(until?: number) {
  return until === undefined
    ? '/me/timeline'
    : `/me/timeline?until=${until}`;
}
