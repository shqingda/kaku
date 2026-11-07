import { useLocalSearchParams } from 'expo-router';

import { EntityDetailScreen } from '@/features/people/entity-detail-screen';
import { useCharacter } from '@/features/people/use-public-entity';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';
import { loadStatus } from '@/lib/query-status';

export default function CharacterScreen() {
  const { id, replyId } = useLocalSearchParams<{
    id: string;
    replyId?: string;
  }>();
  const characterId = parsePositiveIntegerRouteParam(id);
  const characterQuery = useCharacter(characterId ?? 0);

  if (!characterId) {
    return <InvalidRouteState message="这个角色链接缺少有效编号。" />;
  }

  return (
    <EntityDetailScreen
      data={characterQuery.data}
      initialReplyId={replyId}
      {...loadStatus(characterQuery)}
      isRefreshing={characterQuery.isRefetching && !characterQuery.isPending}
      kind="角色"
      onRetry={() => void characterQuery.refetch()}
    />
  );
}
