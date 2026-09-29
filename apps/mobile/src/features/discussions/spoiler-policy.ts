export function shouldHideEpisodeDiscussion(input: {
  enabled: boolean;
  supportsProgress: boolean;
  watched: boolean;
  revealed: boolean;
}) {
  return input.enabled && input.supportsProgress && !input.watched && !input.revealed;
}
