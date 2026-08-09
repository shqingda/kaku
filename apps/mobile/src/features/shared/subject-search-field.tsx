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
        name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
        size={19}
        tintColor={COLORS.muted}
        weight="medium"
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        clearButtonMode="while-editing"
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
    height: 50,
    paddingHorizontal: 16,
  },
  searchInput: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 16,
    height: 24,
    includeFontPadding: false,
    lineHeight: 22,
    paddingVertical: 0,
    textAlignVertical: 'center',
    transform: [{ translateY: Platform.OS === 'ios' ? -1 : 0 }],
  },
});
