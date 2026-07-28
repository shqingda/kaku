import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { GroupTopicRow } from '@/features/community/group-topic-row';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { usePublicCommunity } from '@/features/community/use-community';

export default function CommunityScreen() {
  const communityQuery = usePublicCommunity();
  const community = communityQuery.data;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '社区' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={community?.topics ?? []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !communityQuery.isPending && !communityQuery.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无公开话题。</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <DiscussionStatus
              errorText="社区内容加载失败，请检查网络后重试。"
              isError={communityQuery.isError}
              isPending={communityQuery.isPending}
              loadingText="正在读取 Bangumi 社区…"
              onRetry={() => void communityQuery.refetch()}
            />
            {community ? (
              <>
                <Text style={styles.sectionTitle}>热门小组</Text>
                <ScrollView
                  contentContainerStyle={styles.groupList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {community.groups.map((group) => (
                    <Pressable
                      key={group.name}
                      onPress={() =>
                        router.push({
                          pathname: '/group/[name]',
                          params: { name: group.name },
                        })
                      }
                      style={({ pressed }) => [
                        styles.groupCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.groupIcon}>
                        <Text style={styles.iconFallback}>
                          {group.title.slice(0, 1)}
                        </Text>
                        {group.iconUrl ? (
                          <Image
                            contentFit="cover"
                            source={group.iconUrl}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                      </View>
                      <Text numberOfLines={2} style={styles.groupTitle}>
                        {group.title}
                      </Text>
                      <Text style={styles.groupMeta}>
                        {group.memberCount} 人
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.sectionTitle}>最新话题</Text>
              </>
            ) : null}
          </>
        }
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.topicList,
              index === 0 && styles.firstTopicList,
              index === (community?.topics.length ?? 0) - 1 &&
                styles.lastTopicList,
            ]}
          >
            <GroupTopicRow
              hasDivider={index > 0}
              onPress={() =>
                router.push({
                  pathname: '/group/topic/[id]',
                  params: { id: String(item.id) },
                })
              }
              showGroup
              topic={item}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    paddingBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 20,
  },
  groupList: { gap: 10, paddingBottom: 8, paddingTop: 2 },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    minHeight: 138,
    padding: 12,
    width: 126,
  },
  groupIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  iconFallback: { color: COLORS.subtle, fontSize: 16, fontWeight: '800' },
  groupTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  groupMeta: { color: COLORS.subtle, fontSize: 11, marginTop: 6 },
  topicList: {
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  firstTopicList: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lastTopicList: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  pressed: { opacity: 0.62 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
});
