import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { COLORS } from '@/constants/design';

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
              tintColor={COLORS.accent}
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
            onPress={this.retry}
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
            onPress={this.report}
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
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    maxWidth: 420,
    padding: 28,
    width: '100%',
  },
  icon: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 22,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  title: {
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 50,
    width: '100%',
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  reportButton: { marginTop: 8, padding: 10 },
  reportButtonText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
