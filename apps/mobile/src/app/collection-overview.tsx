import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ThemeColors } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-provider";
import { SubjectTypeTabs } from "@/features/catalog/subject-type-tabs";
import { getSubjectTypeLabel } from "@/features/catalog/subject-types";
import {
  buildCollectionArchiveCsv,
  buildCollectionArchiveJson,
  collectPublicCollectionArchive,
  CollectionArchiveError,
  describeCollectionArchive,
  parseCollectionArchive,
  type CollectionArchiveProgress,
} from "@/features/collections/collection-archive-model";
import {
  buildCollectionOverview,
  buildCollectionOverviewJson,
  buildCollectionOverviewShareText,
  buildCollectionStatusAnalysis,
} from "@/features/collections/collection-overview-model";
import { bangumiUsersProvider } from "@/infrastructure/bangumi/users/provider";
import {
  createCloudExport,
  deleteCloudExport,
  downloadCloudExport,
  listCloudExports,
  type CloudExportRecord,
} from "@/infrastructure/kaku/exports-client";
import { KakuApiError } from "@/infrastructure/kaku/auth-client";
import { buildBrowsingFootprint } from "@/features/history/browsing-footprint-model";
import { usePreferences } from "@/features/preferences/preferences-provider";
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState("");
  const [exportProgress, setExportProgress] =
    useState<CollectionArchiveProgress | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const [selectedSubjectType, setSelectedSubjectType] = useState(2);
  const { isLoading: isAuthLoading, request, session } = useAuth();
  const { preferences } = usePreferences();
  const [cloudExports, setCloudExports] = useState<CloudExportRecord[]>([]);
  const [cloudExportsError, setCloudExportsError] = useState<string | null>(
    null,
  );
  const cloudSyncEnabled = Boolean(session && preferences.syncEnabled);
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

  function cancelExport() {
    exportAbortRef.current?.abort();
  }

  async function refreshCloudExports() {
    if (!session || !cloudSyncEnabled) {
      setCloudExports([]);
      setCloudExportsError(null);
      return;
    }

    try {
      setCloudExports(await listCloudExports(request));
      setCloudExportsError(null);
    } catch (error) {
      setCloudExportsError(
        error instanceof KakuApiError
          ? error.message
          : "云端备份列表暂时读不到。",
      );
    }
  }

  useEffect(() => {
    void refreshCloudExports();
  }, [cloudSyncEnabled, session?.sessionId]);

  async function buildArchive() {
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportProgress({ loaded: 0, total: overview.total });
    try {
      return await collectPublicCollectionArchive({
        fetchPage: (subjectType, offset, signal) =>
          bangumiUsersProvider.getPublicUserCollections(
            username,
            subjectType,
            offset,
            undefined,
            signal,
          ),
        onProgress: setExportProgress,
        signal: controller.signal,
        username,
      });
    } finally {
      exportAbortRef.current = null;
      setExportProgress(null);
    }
  }

  async function exportArchive(format: "json" | "csv") {
    if (!session || exportProgress) return;

    try {
      const archive = await buildArchive();
      const message =
        format === "csv"
          ? buildCollectionArchiveCsv(archive)
          : buildCollectionArchiveJson(archive);
      await Share.share({
        message,
        title: format === "csv" ? "Kaku 收藏 CSV" : "Kaku 收藏 JSON",
      });
      if (archive.truncated) {
        Alert.alert(
          "导出已截断",
          "公开收藏超过 4000 条，这次只导出了前 4000 条。私密笔记不会包含在备份里。",
        );
      }
    } catch (error) {
      if (
        error instanceof CollectionArchiveError &&
        error.message === "已取消导出。"
      ) {
        return;
      }
      Alert.alert(
        "导出失败",
        error instanceof Error ? error.message : "读取公开收藏时出错，请稍后重试。",
      );
    }
  }

  async function saveArchiveToCloud() {
    if (!session || exportProgress) return;
    if (!cloudSyncEnabled) {
      Alert.alert("云同步已关闭", "打开“外观与同步”中的云同步后再保存。");
      return;
    }

    try {
      const archive = await buildArchive();
      const record = await createCloudExport(request, {
        content: buildCollectionArchiveJson(archive),
        format: "json",
      });
      await refreshCloudExports();
      Alert.alert(
        "已保存到云端",
        `7 天内可在本页取回。到期时间 ${new Intl.DateTimeFormat("zh-CN", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(record.expiresAt))}${
          archive.truncated ? "。这份备份已截断到 4000 条。" : ""
        }`,
      );
    } catch (error) {
      if (
        error instanceof CollectionArchiveError &&
        error.message === "已取消导出。"
      ) {
        return;
      }
      Alert.alert(
        "云端保存失败",
        error instanceof Error ? error.message : "备份没有写到云端，请稍后重试。",
      );
    }
  }

  async function shareCloudExport(id: string, format: "json" | "csv") {
    try {
      const content = await downloadCloudExport(request, id);
      await Share.share({
        message: content,
        title: format === "csv" ? "Kaku 云端 CSV" : "Kaku 云端 JSON",
      });
    } catch (error) {
      Alert.alert(
        "无法取回备份",
        error instanceof Error ? error.message : "云端备份暂时读不到。",
      );
    }
  }

  function confirmDeleteCloudExport(id: string) {
    Alert.alert("删除云端备份？", "删除后不能恢复。", [
      { style: "cancel", text: "取消" },
      {
        onPress: () => {
          void deleteCloudExport(request, id)
            .then(() => refreshCloudExports())
            .catch((error: unknown) => {
              Alert.alert(
                "删除失败",
                error instanceof Error ? error.message : "请稍后重试。",
              );
            });
        },
        style: "destructive",
        text: "删除",
      },
    ]);
  }

  function inspectImportedArchive() {
    try {
      const archive = parseCollectionArchive(importDraft);
      const summary = describeCollectionArchive(archive);
      const typeLine = summary.typeCounts
        .map((item) => `${item.label} ${item.total} 部`)
        .join("、");
      Alert.alert(
        "备份校验通过",
        [
          `@${summary.username} · ${summary.total} 部公开收藏`,
          typeLine || "没有条目",
          summary.truncated ? "这份备份曾被截断。" : "",
          "Kaku 不会把备份写回 Bangumi。",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      setIsImportOpen(false);
      setImportDraft("");
    } catch (error) {
      Alert.alert(
        "无法导入",
        error instanceof Error ? error.message : "备份无法识别。",
      );
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
          收藏结构与最近探索，只呈现当前公开数据和最近 10 条浏览。完整备份可导出 JSON/CSV，不含私密笔记。
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
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>完整备份</Text>
              <Text style={styles.subsectionDescription}>
                分页读取你的公开收藏条目。导入只校验内容，不会写回 Bangumi。
              </Text>
              {exportProgress ? (
                <View style={styles.inlineState}>
                  <ActivityIndicator />
                  <Text style={styles.inlineStateText}>
                    正在读取收藏 {exportProgress.loaded.toLocaleString("zh-CN")}/
                    {Math.max(
                      exportProgress.total,
                      exportProgress.loaded,
                    ).toLocaleString("zh-CN")}
                    …
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={cancelExport}
                    style={({ pressed }) => [
                      styles.shareButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.shareButtonText}>取消</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.exportActions}>
                  <ArchiveAction
                    disabled={isSharing}
                    label="导出 JSON"
                    onPress={() => void exportArchive("json")}
                    styles={styles}
                  />
                  <ArchiveAction
                    disabled={isSharing}
                    label="导出 CSV"
                    onPress={() => void exportArchive("csv")}
                    styles={styles}
                  />
                  <ArchiveAction
                    disabled={isSharing}
                    label="导入"
                    onPress={() => setIsImportOpen(true)}
                    styles={styles}
                  />
                  {cloudSyncEnabled ? (
                    <ArchiveAction
                      disabled={isSharing}
                      label="保存到云端"
                      onPress={() => void saveArchiveToCloud()}
                      styles={styles}
                    />
                  ) : null}
                </View>
              )}
              {cloudSyncEnabled ? (
                <>
                  {cloudExportsError ? (
                    <RetryNotice
                      onPress={() => void refreshCloudExports()}
                      styles={styles}
                      text={`${cloudExportsError} · 点此重试`}
                    />
                  ) : null}
                  {cloudExports.length ? (
                    <View style={styles.cloudList}>
                      {cloudExports.map((item) => (
                        <View key={item.id} style={styles.cloudRow}>
                          <View style={styles.cloudCopy}>
                            <Text style={styles.cloudTitle}>
                              {item.format.toUpperCase()} ·{" "}
                              {Math.max(1, Math.round(item.byteSize / 1024))} KB
                            </Text>
                            <Text style={styles.cloudMeta}>
                              {new Intl.DateTimeFormat("zh-CN", {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(item.createdAt))}{" "}
                              ·{" "}
                              {new Intl.DateTimeFormat("zh-CN", {
                                month: "numeric",
                                day: "numeric",
                              }).format(new Date(item.expiresAt))}
                              到期
                            </Text>
                          </View>
                          <ArchiveAction
                            label="取回"
                            onPress={() =>
                              void shareCloudExport(item.id, item.format)
                            }
                            styles={styles}
                          />
                          <ArchiveAction
                            label="删除"
                            onPress={() => confirmDeleteCloudExport(item.id)}
                            styles={styles}
                          />
                        </View>
                      ))}
                    </View>
                  ) : cloudExportsError ? null : (
                    <Text style={styles.subsectionDescription}>
                      还没有云端副本。保存后保留 7 天，最多 5 份。
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.subsectionDescription}>
                  打开“外观与同步”中的云同步后，可以把备份保存 7 天。
                </Text>
              )}
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
          收藏可见性由 Bangumi 决定；最近浏览可在“外观与同步”中管理。完整备份不含私密笔记。
        </Text>
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setIsImportOpen(false)}
        transparent
        visible={isImportOpen}
      >
        <Pressable
          onPress={() => setIsImportOpen(false)}
          style={styles.importScrim}
        >
          <View style={styles.importSheet}>
            <Text style={styles.sectionTitle}>导入备份</Text>
            <Text style={styles.sectionDescription}>
              粘贴 Kaku 导出的 JSON 或 CSV。只做校验，不会改 Bangumi 收藏。
            </Text>
            <TextInput
              accessibilityLabel="收藏备份内容"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              onChangeText={setImportDraft}
              placeholder='{"source":"bangumi-public-collections",...}'
              placeholderTextColor={colors.muted}
              style={styles.importInput}
              value={importDraft}
            />
            <View style={styles.exportActions}>
              <ArchiveAction
                label="取消"
                onPress={() => {
                  setIsImportOpen(false);
                  setImportDraft("");
                }}
                styles={styles}
              />
              <ArchiveAction
                disabled={!importDraft.trim()}
                label="校验"
                onPress={inspectImportedArchive}
                styles={styles}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ArchiveAction({
  disabled,
  label,
  onPress,
  styles,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shareButton,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={styles.shareButtonText}>{label}</Text>
    </Pressable>
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
    exportActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    importScrim: {
      backgroundColor: "rgba(0,0,0,0.4)",
      flex: 1,
      justifyContent: "flex-end",
    },
    importSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      paddingBottom: 32,
    },
    importInput: {
      backgroundColor: colors.surfaceSoft,
      borderCurve: "continuous",
      borderRadius: 14,
      color: colors.ink,
      fontSize: 12,
      marginTop: 14,
      maxHeight: 180,
      minHeight: 120,
      padding: 12,
      textAlignVertical: "top",
    },
    cloudList: { gap: 10, marginTop: 12 },
    cloudRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    cloudCopy: { flex: 1, minWidth: 0 },
    cloudTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
    cloudMeta: { color: colors.subtle, fontSize: 10, marginTop: 2 },
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
