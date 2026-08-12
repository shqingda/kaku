import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { COLORS } from '@/constants/design';

export function SubjectSearchField({
  accessibilityLabel = '搜索条目',
  onChangeText,
  onSubmit,
  placeholder = '搜索条目',
  style,
  value,
}: {
  accessibilityLabel?: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  value: string;
}) {
  return (
    <View style={[styles.searchBox, style]}>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
        size={19}
        tintColor={COLORS.muted}
        weight="medium"
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="输入关键词后搜索 Bangumi 条目"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        maxFontSizeMultiplier={1.35}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        returnKeyType="search"
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderCurve: 'continuous',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  searchInput: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 24,
    includeFontPadding: false,
    lineHeight: 22,
    paddingVertical: 0,
    textAlignVertical: 'center',
    transform: [{ translateY: Platform.OS === 'ios' ? -1 : 0 }],
  },
});
