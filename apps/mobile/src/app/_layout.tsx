import { useEffect, useState } from 'react';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/lib/sentry';
import { AuthProvider } from '@/features/auth/auth-provider';
import { RecentSubjectsProvider } from '@/features/history/recent-subjects-provider';
import { PreferencesProvider } from '@/features/preferences/preferences-provider';
import { useNotificationNavigation } from '@/features/push/use-notification-navigation';
import { useHomeScreenShortcuts } from '@/features/quick-actions/use-home-screen-shortcuts';
import { SearchHistoryProvider } from '@/features/search/search-history-provider';
import { AppErrorBoundary } from '@/features/shared/app-error-boundary';
import { HeaderBackButton } from '@/features/shared/header-back-button';
import { HeaderHomeButton } from '@/features/shared/header-home-button';
import { OfflineBanner } from '@/features/shared/offline-banner';
import {
  ThemeProvider,
  useTheme,
  useThemeScheme,
} from '@/features/theme/theme-provider';
import {
  bangumiRetryDelay,
  shouldRetryBangumiQuery,
} from '@/lib/query-retry';
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  shouldPersistPublicQuery,
} from '@/lib/query-persistence';
import { queryPersister } from '@/lib/query-persister';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: QUERY_CACHE_MAX_AGE,
            refetchOnReconnect: true,
            retry: shouldRetryBangumiQuery,
            retryDelay: bangumiRetryDelay,
          },
        },
      }),
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;

    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            buster: QUERY_CACHE_BUSTER,
            dehydrateOptions: {
              shouldDehydrateMutation: () => false,
              shouldDehydrateQuery: shouldPersistPublicQuery,
            },
            maxAge: QUERY_CACHE_MAX_AGE,
            persister: queryPersister,
          }}
        >
          <AuthProvider>
            <PreferencesProvider>
              <SearchHistoryProvider>
                <RecentSubjectsProvider>
                  <ThemeProvider>
                    <RootNavigator />
                  </ThemeProvider>
                </RecentSubjectsProvider>
              </SearchHistoryProvider>
            </PreferencesProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

// 带标题栏的屏幕：[路由名, 标题]。样式由 RootNavigator 统一下发，
// 只有首页、登录回调和条目详情需要单独的配置。
const TITLED_SCREENS = [
  ['timeline', '好友动态'],
  ['account', '账户'],
  ['settings', '外观与同步'],
  ['about', '关于 Kaku'],
  ['diagnostics', '诊断信息'],
  ['changelog', '更新日志'],
  ['network-status', '网络诊断'],
  ['privacy', '隐私政策'],
  ['notifications', '通知'],
  ['blog/[id]', '日志'],
  ['blogs', '日志'],
  ['community', '社区'],
  ['channel/[type]', '频道'],
  ['calendar', '每日放送'],
  ['browse', '分类浏览'],
  ['tags', '标签索引'],
  ['wiki', '维基动态'],
  ['group/[name]', '小组'],
  ['group/topic/[id]', '小组话题'],
  ['directory/[id]', '目录'],
  ['directories', '目录发现'],
  ['people', '人物'],
  ['character/[id]', '角色详情'],
  ['person/[id]', '人物详情'],
  ['user/[username]', '用户主页'],
  ['user/collections/[username]', '收藏'],
  ['user/blogs/[username]', '日志'],
  ['user/friends/[username]', '好友'],
  ['user/entities/[username]', '角色与人物'],
  ['user/timeline/[username]', '时间线'],
  ['explore', '综合'],
  ['rankings', '排行榜'],
  ['subject/[id]/topic/[topicId]', '讨论'],
  ['subject/[id]/discussions', '讨论版'],
  ['subject/[id]/episode/[episodeNumber]', ''],
  ['subject/[id]/characters', '角色与声优'],
  ['subject/[id]/info', '条目资料'],
  ['subject/[id]/indexes', '目录'],
  ['subject/[id]/relations', '关联条目'],
  ['subject/[id]/comments', '吐槽箱'],
  ['subject/[id]/reviews', '评论'],
  ['subject/[id]/review/[reviewId]', '评论'],
  ['subject/[id]/staff', '制作人员'],
] as const;

function RootNavigator() {
  const colors = useTheme();
  const scheme = useThemeScheme();
  useHomeScreenShortcuts();
  useNotificationNavigation();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          ...(Platform.OS === 'ios'
            ? {
                unstable_headerLeftItems: () => [
                  {
                    element: <HeaderBackButton />,
                    hidesSharedBackground: true,
                    type: 'custom' as const,
                  },
                ],
                unstable_headerRightItems: () => [
                  {
                    element: <HeaderHomeButton />,
                    hidesSharedBackground: true,
                    type: 'custom' as const,
                  },
                ],
              }
            : {
                // Android/web: without a custom headerLeft the native
                // stack draws its own ~24dp back arrow, which dwarfs the
                // 19pt SymbolView used everywhere else.
                headerLeft: () => <HeaderBackButton />,
                headerRight: () => <HeaderHomeButton />,
              }),
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerTitleStyle: { color: colors.ink },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen
          name="subject/[id]"
          options={{
            autoHideHomeIndicator: true,
            headerShown: false,
          }}
        />
        {TITLED_SCREENS.map(([name, title]) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title,
            }}
          />
        ))}
      </Stack>
      <OfflineBanner />
    </>
  );
}
