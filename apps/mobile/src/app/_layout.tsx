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

function RootNavigator() {
  const colors = useTheme();
  const scheme = useThemeScheme();
  useHomeScreenShortcuts();

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
          <Stack.Screen
            name="timeline"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '好友动态',
            }}
          />
          <Stack.Screen
            name="account"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '账户',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '外观与同步',
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '关于 Kaku',
            }}
          />
          <Stack.Screen
            name="diagnostics"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '诊断信息',
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '通知',
            }}
          />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen
            name="blog/[id]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '日志',
            }}
          />
          <Stack.Screen
            name="blogs"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '日志',
            }}
          />
          <Stack.Screen
            name="community"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '社区',
            }}
          />
          <Stack.Screen
            name="channel/[type]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '频道',
            }}
          />
          <Stack.Screen
            name="calendar"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '每日放送',
            }}
          />
          <Stack.Screen
            name="browse"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '分类浏览',
            }}
          />
          <Stack.Screen
            name="tags"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '标签索引',
            }}
          />
          <Stack.Screen
            name="wiki"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '维基动态',
            }}
          />
          <Stack.Screen
            name="group/[name]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '小组',
            }}
          />
          <Stack.Screen
            name="group/topic/[id]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '小组话题',
            }}
          />
          <Stack.Screen
            name="directory/[id]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '目录',
            }}
          />
          <Stack.Screen
            name="directories"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '目录发现',
            }}
          />
          <Stack.Screen
            name="people"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '人物',
            }}
          />
          <Stack.Screen
            name="character/[id]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '角色详情',
            }}
          />
          <Stack.Screen
            name="person/[id]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '人物详情',
            }}
          />
          <Stack.Screen
            name="user/[username]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '用户主页',
            }}
          />
          <Stack.Screen
            name="user/collections/[username]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '收藏',
            }}
          />
          <Stack.Screen
            name="user/blogs/[username]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '日志',
            }}
          />
          <Stack.Screen
            name="user/friends/[username]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '好友',
            }}
          />
          <Stack.Screen
            name="user/entities/[username]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '角色与人物',
            }}
          />
          <Stack.Screen
            name="user/timeline/[username]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '时间线',
            }}
          />
          <Stack.Screen
            name="explore"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '综合',
            }}
          />
          <Stack.Screen
            name="rankings"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '排行榜',
            }}
          />
          <Stack.Screen
            name="subject/[id]"
            options={{
              autoHideHomeIndicator: true,
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="subject/[id]/topic/[topicId]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '讨论',
            }}
          />
          <Stack.Screen
            name="subject/[id]/discussions"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '讨论版',
            }}
          />
          <Stack.Screen
            name="subject/[id]/episode/[episodeNumber]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '',
            }}
          />
          <Stack.Screen
            name="subject/[id]/characters"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '角色与声优',
            }}
          />
          <Stack.Screen
            name="subject/[id]/info"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '条目资料',
            }}
          />
          <Stack.Screen
            name="subject/[id]/indexes"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '目录',
            }}
          />
          <Stack.Screen
            name="subject/[id]/relations"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '关联条目',
            }}
          />
          <Stack.Screen
            name="subject/[id]/comments"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '吐槽箱',
            }}
          />
          <Stack.Screen
            name="subject/[id]/reviews"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '评论',
            }}
          />
          <Stack.Screen
            name="subject/[id]/review/[reviewId]"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '评论',
            }}
          />
          <Stack.Screen
            name="subject/[id]/staff"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '制作人员',
            }}
          />
          </Stack>
      <OfflineBanner />
    </>
  );
}
