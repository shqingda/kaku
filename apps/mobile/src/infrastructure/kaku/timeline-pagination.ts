// Persisted infinite queries store page params as JSON, where the first
// page's cursor comes back as null. Treat null and undefined alike.
export function getFriendTimelinePath(until?: number | null) {
  return until == null
    ? '/me/timeline'
    : `/me/timeline?until=${until}`;
}
