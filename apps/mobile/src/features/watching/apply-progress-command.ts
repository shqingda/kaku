export type WatchingProgress = {
  lastCommandId?: string;
  totalEpisodes: number;
  updatedAt: number;
  watchedCount: number;
};

export type ProgressCommand = {
  id: string;
  updatedAt: number;
  watchedCount: number;
};

export function applyProgressCommand(
  current: WatchingProgress,
  command: ProgressCommand,
): WatchingProgress {
  if (
    command.id === current.lastCommandId ||
    command.updatedAt < current.updatedAt
  ) {
    return current;
  }

  const watchedCount = Math.min(
    Math.max(Math.trunc(command.watchedCount), 0),
    current.totalEpisodes,
  );

  return {
    ...current,
    lastCommandId: command.id,
    updatedAt: command.updatedAt,
    watchedCount,
  };
}
