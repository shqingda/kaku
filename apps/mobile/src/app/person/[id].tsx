import { useLocalSearchParams } from 'expo-router';

import { EntityDetailScreen } from '@/features/people/entity-detail-screen';
import { usePerson } from '@/features/people/use-public-entity';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = parsePositiveIntegerRouteParam(id);
  const personQuery = usePerson(personId ?? 0);

  if (!personId) {
    return <InvalidRouteState message="这个人物链接缺少有效编号。" />;
  }

  return (
    <EntityDetailScreen
      data={personQuery.data}
      isError={personQuery.isError}
      isPending={personQuery.isPending}
      isRefreshing={personQuery.isRefetching && !personQuery.isPending}
      kind="人物"
      onRetry={() => void personQuery.refetch()}
    />
  );
}
