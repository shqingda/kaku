import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { recordDiagnosticError } from '@/lib/diagnostic-log';
import { useTheme } from '@/features/theme/theme-provider';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kaku render error', error, info.componentStack);
    void recordDiagnosticError(error, info.componentStack).catch(() => {
      // 诊断记录本身失败时不能再次触发错误边界。
    });
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  private report = () => {
    void Linking.openURL('https://github.com/shqingda/kaku/issues/new').catch(
      () => Alert.alert('暂时无法打开反馈页面', '请检查网络后重试。'),
    );
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <ErrorFallback onReport={this.report} onRetry={this.retry} />;
  }
}

// 回退 UI 是函数组件，才能跟随当前主题（错误边界本身必须是 class）。
function ErrorFallback({
  onReport,
  onRetry,
}: {
  onReport: () => void;
  onRetry: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="alert" style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <SymbolView
            name={{
              android: 'error_outline',
              ios: 'exclamationmark.triangle',
              web: 'error_outline',
            }}
            size={25}
            tintColor={colors.accent}
            weight="medium"
          />
        </View>
        <Text style={styles.title}>这个页面暂时无法显示</Text>
        <Text style={styles.message}>
          你的收藏和登录数据没有被删除。可以先尝试重新显示页面。
        </Text>
        <Pressable
          accessibilityLabel="重新显示页面"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>重新显示</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="在 GitHub 反馈问题"
          accessibilityRole="link"
          onPress={onReport}
          style={({ pressed }) => [
            styles.reportButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.reportButtonText}>反馈问题</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
      padding: SPACING.xl,
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 28,
      maxWidth: 420,
      padding: SPACING.xxl,
      width: '100%',
    },
    icon: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 22,
      height: 64,
      justifyContent: 'center',
      width: 64,
    },
    title: {
      color: colors.ink,
      ...TYPE.title,
      fontWeight: '800',
      marginTop: SPACING.xl,
      textAlign: 'center',
    },
    message: {
      color: colors.muted,
      ...TYPE.body,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 15,
      justifyContent: 'center',
      marginTop: SPACING.xl,
      minHeight: 50,
      width: '100%',
    },
    primaryButtonText: {
      color: colors.surface,
      ...TYPE.body,
      fontWeight: '800',
    },
    reportButton: { marginTop: SPACING.sm, padding: SPACING.md },
    reportButtonText: { color: colors.muted, ...TYPE.caption, fontWeight: '600' },
    pressed: { opacity: 0.62 },
  });
