import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING } from '@/constants/design';
import { AppIconPicker } from '@/features/app-icon/app-icon-picker';
import { useAppIcon } from '@/features/app-icon/use-app-icon';
import { useTheme } from '@/features/theme/theme-provider';

export default function AppIconScreen() {
  const colors = useTheme();
  const appIcon = useAppIcon();

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppIconPicker
          current={appIcon.current}
          error={appIcon.error}
          onSelect={(id) => void appIcon.select(id)}
          pending={appIcon.pending}
          status={appIcon.status}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
});
