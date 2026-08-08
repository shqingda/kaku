import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { AuthProvider } from '@/features/auth/auth-provider';
import {
  bangumiRetryDelay,
  shouldRetryBangumiQuery,
} from '@/lib/query-retry';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 30 * 60 * 1000,
            refetchOnReconnect: true,
            retry: shouldRetryBangumiQuery,
            retryDelay: bangumiRetryDelay,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
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
            name="community"
            options={{
              headerBackButtonDisplayMode: 'minimal',
              headerShown: true,
              headerShadowVisible: false,
              title: '社区',
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
              title: '发现',
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
      </AuthProvider>
    </QueryClientProvider>
  );
}
