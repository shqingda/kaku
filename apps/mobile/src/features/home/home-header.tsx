import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import type { AuthSession } from '@/features/auth/model';
import { useSearchDraft } from '@/features/search/search-draft';
import { useSearchHistory } from '@/features/search/search-history-provider';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { useTheme } from '@/features/theme/theme-provider';

import { ProfileMenu } from './profile-menu';

export function HomeHeader({ session }: { session: AuthSession | null }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { addSearch } = useSearchHistory();
  const [searchDraft, setSearchDraft] = useSearchDraft();

  function submitSearch() {
    const keyword = searchDraft.trim();

    if (!keyword) {
      return;
    }

    Keyboard.dismiss();
    addSearch(keyword);
    router.push({ pathname: '/explore', params: { q: keyword } });
  }

  return (
    <View style={styles.area}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.brand}>Kaku</Text>
        {session ? (
          <ProfileMenu session={session} />
        ) : (
          <Pressable
            accessibilityLabel="登录 Bangumi"
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => router.push('/account')}
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                android: 'account_circle',
                ios: 'person.crop.circle',
                web: 'account_circle',
              }}
              size={34}
              tintColor={colors.ink}
              weight="semibold"
            />
          </Pressable>
        )}
      </View>

      <View style={styles.tools}>
        <SubjectSearchField
          onChangeText={setSearchDraft}
          onSubmit={submitSearch}
          value={searchDraft}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  area: { paddingBottom: 8, paddingTop: 10 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  brand: {
    color: colors.ink,
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
  tools: { marginTop: 14 },
  pressed: { opacity: 0.62 },
});
