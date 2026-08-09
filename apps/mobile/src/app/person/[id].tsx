import { useLocalSearchParams } from 'expo-router';

import { EntityDetailScreen } from '@/features/people/entity-detail-screen';
import { usePerson } from '@/features/people/use-public-entity';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personQuery = usePerson(Number(id));

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
