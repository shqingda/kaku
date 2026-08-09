import { useLocalSearchParams } from 'expo-router';

import { EntityDetailScreen } from '@/features/people/entity-detail-screen';
import { useCharacter } from '@/features/people/use-public-entity';

export default function CharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterQuery = useCharacter(Number(id));

  return (
    <EntityDetailScreen
      data={characterQuery.data}
      isError={characterQuery.isError}
      isPending={characterQuery.isPending}
      isRefreshing={characterQuery.isRefetching && !characterQuery.isPending}
      kind="角色"
      onRetry={() => void characterQuery.refetch()}
    />
  );
}
