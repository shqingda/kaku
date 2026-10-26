import type { PersonalCollection, PersonalCollectionUpdate } from '../collections/model.ts';

// Marking an episode moves "wish" or "no status" to "doing". Only send
// collectionStatus when it actually changes: Bangumi's v0 API writes a timeline
// event for every PUT that carries a type, so unchanged saves should stay quiet
// (the website behaves the same way).
export function episodeProgressUpdate(
  currentStatus: PersonalCollection['collectionStatus'] | undefined,
  episodeId: number,
  watched: boolean,
): PersonalCollectionUpdate {
  const nextStatus = !currentStatus || currentStatus === 'wish' ? 'doing' : currentStatus;
  return {
    ...(nextStatus !== currentStatus ? { collectionStatus: nextStatus } : {}),
    episodeChanges: [{ episodeId, watched }],
  };
}
