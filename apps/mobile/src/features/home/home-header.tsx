import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';
import type { AuthSession } from '@/features/auth/model';

export function HomeHeader({ session }: { session: AuthSession | null }) {
  const [searchDraft, setSearchDraft] = useState('');

  function submitSearch() {
    const keyword = searchDraft.trim();

    if (!keyword) {
      return;
    }

    Keyboard.dismiss();
    router.push({ pathname: '/explore', params: { q: keyword } });
  }

  function openProfile() {
    if (!session) {
      router.push('/account');
      return;
    }

    router.push({
      pathname: '/user/[username]',
      params: { username: session.user.username },
    });
  }

  return (
    <View style={styles.area}>
      <View style={styles.header}>
        <Text style={styles.brand}>Kaku</Text>
        <Pressable
          accessibilityLabel={session ? '查看我的公开主页' : '登录 Bangumi'}
          accessibilityRole="button"
          hitSlop={6}
          onPress={openProfile}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && styles.pressed,
          ]}
        >
          {session?.user.avatarUrl ? (
            <Image
              contentFit="cover"
              source={session.user.avatarUrl}
              style={styles.avatar}
            />
          ) : (
            <SymbolView
              name={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              size={34}
              tintColor={COLORS.ink}
              weight="semibold"
            />
          )}
        </Pressable>
      </View>

      <View style={styles.tools}>
        <View style={styles.searchBox}>
          <SymbolView
            name={{
              android: 'search',
              ios: 'magnifyingglass',
              web: 'search',
            }}
            size={19}
            tintColor={COLORS.muted}
            weight="medium"
          />
          <TextInput
            accessibilityLabel="搜索条目"
            clearButtonMode="while-editing"
            onChangeText={setSearchDraft}
            onSubmitEditing={submitSearch}
            placeholder="搜索条目"
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchDraft}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { paddingBottom: 24, paddingTop: 10 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  brand: {
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  avatarButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatar: { borderRadius: 18, height: 36, width: 36 },
  tools: { marginTop: 14 },
  searchBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
  },
  searchInput: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 16,
    height: 50,
    paddingVertical: 0,
  },
  pressed: { opacity: 0.62 },
});
