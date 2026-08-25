import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ThemeColors } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-provider";
import { SubjectTypeTabs } from "@/features/catalog/subject-type-tabs";
import { getSubjectTypeLabel } from "@/features/catalog/subject-types";
import {
  buildCollectionOverview,
  buildCollectionOverviewJson,
  buildCollectionOverviewShareText,
  buildCollectionStatusAnalysis,
} from "@/features/collections/collection-overview-model";
import { buildBrowsingFootprint } from "@/features/history/browsing-footprint-model";
import { useRecentSubjects } from "@/features/history/recent-subjects-provider";
import { HorizontalBarChart } from "@/features/insights/horizontal-bar-chart";
import { useTheme } from "@/features/theme/theme-provider";
import { usePublicUserCollections } from "@/features/users/use-public-user";
import type { CollectionStatus } from "@/features/watching/model";

const COLLECTION_TYPES = [2, 1, 3, 4, 6] as const;
const COLLECTION_STATUSES: CollectionStatus[] = [
  "completed",
  "doing",
  "wish",
  "onHold",
  "dropped",
];

export default function PersonalDataScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedSubjectType, setSelectedSubjectType] = useState(2);
  const { isLoading: isAuthLoading, session } = useAuth();
  const recentSubjects = useRecentSubjects();
  const footprint = useMemo(
    () => buildBrowsingFootprint(recentSubjects.items),
    [recentSubjects.items],
  );
  const username = session?.user.username ?? "";
  const animeQuery = usePublicUserCollections(username, 2);
  const bookQuery = usePublicUserCollections(username, 1);
  const musicQuery = usePublicUserCollections(username, 3);
  const gameQuery = usePublicUserCollections(username, 4);
  const realQuery = usePublicUserCollections(username, 6);
  const completedQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    "completed",
  );
  const doingQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    "doing",
  );
  const wishQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    "wish",
  );
  const onHoldQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    "onHold",
  );
  const droppedQuery = usePublicUserCollections(
    username,
    selectedSubjectType,
    "dropped",
  );
  const typeQueries = [animeQuery, bookQuery, musicQuery, gameQuery, realQuery];
  const statusQueries = [
    completedQuery,
    doingQuery,
    wishQuery,
    onHoldQuery,
    droppedQuery,
  ];
  const allQueries = [...typeQueries, ...statusQueries];
  const hasCompleteTypeData = typeQueries.every(
    (query) => query.data?.pages[0]?.total !== undefined,
  );
  const hasCompleteStatusData = statusQueries.every(
    (query) => query.data?.pages[0]?.total !== undefined,
  );
  const overview = buildCollectionOverview(
    COLLECTION_TYPES.map((subjectType, index) => ({
      subjectType,
      total: typeQueries[index].data?.pages[0]?.total ?? 0,
    })),
  );
  const statusAnalysis = buildCollectionStatusAnalysis(
    selectedSubjectType,
    COLLECTION_STATUSES.map((status, index) => ({
      status,
      total: statusQueries[index].data?.pages[0]?.total ?? 0,
    })),
  );
  const selectedTypeLabel = getSubjectTypeLabel(selectedSubjectType);
  const selectedTypeTotal =
    overview.items.find((item) => item.subjectType === selectedSubjectType)
      ?.total ?? 0;
  const primaryBrowseType = footprint.typeCounts[0]?.label ?? "—";
  const isRefreshing =
    recentSubjects.syncing ||
    allQueries.some((query) => query.isRefetching && !query.isPending);

  function refresh() {
    void recentSubjects.refreshFromCloud();
    if (session) void Promise.all(allQueries.map((query) => query.refetch()));
  }

  function retryStatusAnalysis() {
    void Promise.all(statusQueries.map((query) => query.refetch()));
  }

  async function shareOverview(format: "json" | "text") {
    setIsSharing(true);
    try {
      await Share.share({
        message:
          format === "json"
            ? buildCollectionOverviewJson(overview, username)
            : buildCollectionOverviewShareText(overview, username),
        title: format === "json" ? "Kaku 我的数据 JSON" : "Kaku 我的数据",
      });
    } catch {
      Alert.alert("暂时无法分享", "系统分享面板没有打开，请稍后重试。");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={refresh}
            progressBackgroundColor={colors.surface}
            refreshing={isRefreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>KAKU DATA</Text>
        <Text accessibilityRole="header" style={styles.title}>
          我的数据
        </Text>
        <Text style={styles.description}>
          收藏结构与最近探索，只呈现当前公开数据和最近 10 条浏览。
        </Text>

        <View style={styles.section}>
          <SectionHeader
            description="公开收藏的结构与当前进度"
            styles={styles}
            title="收藏"
          />
          {isAuthLoading ? (
            <InlineLoading styles={styles} text="正在读取账户信息…" />
          ) : !session ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/account")}
              style={({ pressed }) => [
                styles.loginPrompt,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.loginTitle}>登录后查看收藏数据</Text>
              <Text style={styles.loginText}>
                连接 Bangumi，只读取你的公开收藏总数。
              </Text>
            </Pressable>
          ) : typeQueries.some((query) => query.isPending) &&
            !hasCompleteTypeData ? (
            <InlineLoading styles={styles} text="正在汇总公开收藏…" />
          ) : !hasCompleteTypeData ? (
            <RetryNotice
              onPress={() =>
                void Promise.all(typeQueries.map((query) => query.refetch()))
              }
              styles={styles}
              text="收藏数据暂时不完整 · 点此重试"
            />
          ) : (
            <>
              {typeQueries.some((query) => query.isError) ? (
                <RetryNotice
                  onPress={() =>
                    void Promise.all(
                      typeQueries.map((query) => query.refetch()),
                    )
                  }
                  styles={styles}
                  text="刷新失败，当前展示上次缓存 · 点此重试"
                />
              ) : null}
              <SubjectTypeTabs
                contentContainerStyle={styles.typeTabs}
                onChange={setSelectedSubjectType}
                selectedType={selectedSubjectType}
              />
              {statusQueries.some((query) => query.isPending) &&
              !hasCompleteStatusData ? (
                <InlineLoading
                  styles={styles}
                  text={`正在读取${selectedTypeLabel}状态…`}
                />
              ) : !hasCompleteStatusData ? (
                <RetryNotice
                  onPress={retryStatusAnalysis}
                  styles={styles}
                  text="状态数据暂时不完整 · 点此重试"
                />
              ) : (
                <>
                  {statusQueries.some((query) => query.isError) ? (
                    <RetryNotice
                      onPress={retryStatusAnalysis}
                      styles={styles}
                      text="状态刷新失败，当前展示缓存 · 点此重试"
                    />
                  ) : null}
                  <DataSummary
                    facts={[
                      {
                        label: "已完成",
                        value: statusAnalysis.completed.toLocaleString("zh-CN"),
                      },
                      {
                        label: "搁置",
                        value:
                          statusAnalysis.items
                            .find((item) => item.status === "onHold")
                            ?.total.toLocaleString("zh-CN") ?? "0",
                      },
                      {
                        label: "放弃",
                        value:
                          statusAnalysis.items
                            .find((item) => item.status === "dropped")
                            ?.total.toLocaleString("zh-CN") ?? "0",
                      },
                    ]}
                    metrics={[
                      {
                        label: `${selectedTypeLabel}收藏`,
                        value: selectedTypeTotal.toLocaleString("zh-CN"),
                      },
                      {
                        label: "进行中",
                        value: statusAnalysis.active.toLocaleString("zh-CN"),
                      },
                      {
                        label: "待开始",
                        value: statusAnalysis.backlog.toLocaleString("zh-CN"),
                      },
                    ]}
                    styles={styles}
                  />
                  <Text style={styles.subsectionTitle}>状态分布</Text>
                  {statusAnalysis.total ? (
                    <HorizontalBarChart
                      denominator={statusAnalysis.total}
                      items={statusAnalysis.items
                        .filter((item) => item.total > 0)
                        .map((item) => ({
                          id: item.status,
                          label: item.label,
                          value: item.total,
                        }))}
                      onItemPress={(item) =>
                        router.push({
                          pathname: "/user/collections/[username]",
                          params: {
                            status: String(item.id),
                            type: String(selectedSubjectType),
                            username,
                          },
                        })
                      }
                    />
                  ) : (
                    <Text style={styles.emptyChartText}>
                      暂无{selectedTypeLabel}收藏
                    </Text>
                  )}
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.subsectionHeading}>
                <View>
                  <Text style={styles.subsectionTitle}>媒体构成</Text>
                  <Text style={styles.subsectionDescription}>
                    共 {overview.total.toLocaleString("zh-CN")} 部公开收藏
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="分享收藏数据，长按导出 JSON"
                  accessibilityRole="button"
                  disabled={isSharing}
                  onPress={() => void shareOverview("text")}
                  onLongPress={() => void shareOverview("json")}
                  style={({ pressed }) => [
                    styles.shareButton,
                    (pressed || isSharing) && styles.pressed,
                  ]}
                >
                  <Text style={styles.shareButtonText}>分享</Text>
                </Pressable>
              </View>
              <HorizontalBarChart
                denominator={overview.total}
                items={overview.items
                  .filter((item) => item.total > 0)
                  .map((item) => ({
                    id: item.subjectType,
                    label: item.label,
                    value: item.total,
                  }))}
                onItemPress={(item) =>
                  router.push({
                    pathname: "/user/collections/[username]",
                    params: { type: String(item.id), username },
                  })
                }
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            description="同步后的最近 10 条浏览，不代表完整历史"
            styles={styles}
            title="最近浏览"
          />
          {recentSubjects.cloudError ? (
            <RetryNotice
              onPress={() => void recentSubjects.retryCloudSync()}
              styles={styles}
              text="最近浏览同步失败 · 点此重试"
            />
          ) : null}
          {recentSubjects.items.length ? (
            <>
              <DataSummary
                facts={[
                  {
                    label: "最近记录",
                    value: footprint.latestViewedAt
                      ? new Intl.DateTimeFormat("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(footprint.latestViewedAt))
                      : "—",
                  },
                ]}
                metrics={[
                  {
                    label: "近期条目",
                    value: String(footprint.uniqueSubjects),
                  },
                  {
                    label: "媒体类型",
                    value: String(footprint.typeCounts.length),
                  },
                  { label: "主要类型", value: primaryBrowseType },
                ]}
                styles={styles}
              />
              <Text style={styles.subsectionTitle}>类型分布</Text>
              <HorizontalBarChart
                denominator={recentSubjects.items.length}
                items={footprint.typeCounts.map((item) => ({
                  id: item.type,
                  label: item.label,
                  value: item.count,
                }))}
                valueSuffix="条"
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>还没有最近浏览</Text>
              <Text style={styles.emptyText}>
                打开几个条目后，这里会整理你的近期探索。
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.footnote}>
          收藏可见性由 Bangumi 决定；最近浏览可在“外观与同步”中管理。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  description,
  styles,
  title,
}: {
  description: string;
  styles: ReturnType<typeof createStyles>;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

function DataSummary({
  facts,
  metrics,
  styles,
}: {
  facts: Array<{ label: string; value: string }>;
  metrics: Array<{ label: string; value: string }>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryPanel}>
      <View style={styles.metrics}>
        {metrics.map((metric, index) => (
          <View key={metric.label} style={styles.metricGroup}>
            {index > 0 ? <View style={styles.metricDivider} /> : null}
            <View style={styles.metric}>
              <Text numberOfLines={1} selectable style={styles.metricValue}>
                {metric.value}
              </Text>
              <Text numberOfLines={1} style={styles.metricLabel}>
                {metric.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {facts.length ? (
        <>
          <View style={styles.summaryDivider} />
          <View style={styles.facts}>
            {facts.map((fact) => (
              <View key={fact.label} style={styles.fact}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text numberOfLines={1} selectable style={styles.factValue}>
                  {fact.value}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function InlineLoading({
  styles,
  text,
}: {
  styles: ReturnType<typeof createStyles>;
  text: string;
}) {
  return (
    <View style={styles.inlineState}>
      <ActivityIndicator />
      <Text style={styles.inlineStateText}>{text}</Text>
    </View>
  );
}

function RetryNotice({
  onPress,
  styles,
  text,
}: {
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  text: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.notice, pressed && styles.pressed]}
    >
      <Text style={styles.noticeText}>{text}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { padding: 24, paddingBottom: 40 },
    eyebrow: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.1,
    },
    title: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -0.5,
      lineHeight: 30,
      marginTop: 7,
    },
    description: {
      color: colors.subtle,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 8,
      maxWidth: 350,
    },
    section: {
      backgroundColor: colors.surface,
      borderCurve: "continuous",
      borderRadius: 22,
      marginTop: 18,
      padding: 20,
    },
    sectionHeader: { marginBottom: 16 },
    sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
    sectionDescription: {
      color: colors.subtle,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },
    typeTabs: { paddingBottom: 16 },
    summaryPanel: {
      backgroundColor: colors.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 18,
      padding: 16,
    },
    metrics: { alignItems: "center", flexDirection: "row" },
    metricGroup: { alignItems: "center", flex: 1, flexDirection: "row" },
    metric: { alignItems: "center", flex: 1, minWidth: 0 },
    metricValue: {
      color: colors.ink,
      fontSize: 21,
      fontVariant: ["tabular-nums"],
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    metricLabel: {
      color: colors.subtle,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 5,
    },
    metricDivider: {
      backgroundColor: colors.track,
      height: 34,
      width: StyleSheet.hairlineWidth,
    },
    summaryDivider: {
      backgroundColor: colors.track,
      height: StyleSheet.hairlineWidth,
      marginVertical: 16,
    },
    facts: { flexDirection: "row", gap: 10 },
    fact: { flex: 1 },
    factLabel: { color: colors.subtle, fontSize: 10, fontWeight: "600" },
    factValue: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 5,
    },
    subsectionTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 18,
    },
    subsectionDescription: { color: colors.subtle, fontSize: 11, marginTop: 3 },
    subsectionHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    divider: {
      backgroundColor: colors.track,
      height: StyleSheet.hairlineWidth,
      marginVertical: 2,
    },
    shareButton: {
      alignItems: "center",
      backgroundColor: colors.accentSoft,
      borderCurve: "continuous",
      borderRadius: 12,
      justifyContent: "center",
      minHeight: 36,
      paddingHorizontal: 13,
    },
    shareButtonText: {
      color: colors.accentRich,
      fontSize: 12,
      fontWeight: "800",
    },
    inlineState: {
      alignItems: "center",
      gap: 9,
      justifyContent: "center",
      minHeight: 116,
    },
    inlineStateText: { color: colors.subtle, fontSize: 12 },
    notice: {
      backgroundColor: colors.accentSoft,
      borderCurve: "continuous",
      borderRadius: 13,
      marginBottom: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    noticeText: {
      color: colors.accentRich,
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 17,
    },
    loginPrompt: {
      backgroundColor: colors.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 16,
      padding: 16,
    },
    loginTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
    loginText: {
      color: colors.subtle,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },
    emptyState: {
      backgroundColor: colors.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 16,
      padding: 16,
    },
    emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
    emptyText: {
      color: colors.subtle,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },
    emptyChartText: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      paddingVertical: 16,
    },
    footnote: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 14,
      paddingHorizontal: 4,
    },
    pressed: { opacity: 0.62 },
  });
