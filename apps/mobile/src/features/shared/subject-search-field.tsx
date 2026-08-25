import { useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { HIT_SLOP } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

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
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);

  function clearInput() {
    onChangeText('');
    inputRef.current?.focus();
  }

  return (
    <View style={[styles.searchBox, style]}>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
        size={19}
        tintColor={colors.muted}
        weight="medium"
      />
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="输入关键词后搜索 Bangumi 条目"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        maxFontSizeMultiplier={1.35}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={styles.searchInput}
        value={value}
      />
      {Platform.OS === 'android' && value.length > 0 ? (
        <Pressable
          accessibilityHint="清空后继续输入"
          accessibilityLabel="清空搜索内容"
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={clearInput}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.clearButtonPressed,
          ]}
        >
          <SymbolView
            name={{ android: 'cancel', ios: 'xmark.circle.fill', web: 'cancel' }}
            size={20}
            tintColor={colors.muted}
            weight="medium"
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    searchBox: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 15,
      flexDirection: 'row',
      gap: 10,
      minHeight: 50,
      paddingHorizontal: 16,
    },
    searchInput: {
      color: colors.ink,
      flex: 1,
      fontSize: 16,
      minHeight: 24,
      includeFontPadding: false,
      lineHeight: 22,
      paddingVertical: 0,
      textAlignVertical: 'center',
      transform: [{ translateY: Platform.OS === 'ios' ? -1 : 0 }],
    },
    clearButton: {
      alignItems: 'center',
      height: 32,
      justifyContent: 'center',
      marginRight: -6,
      width: 32,
    },
    clearButtonPressed: {
      opacity: 0.58,
      transform: [{ scale: 0.94 }],
    },
  });
