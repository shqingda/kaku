import { SymbolView } from 'expo-symbols';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { getCollectionStatusLabel } from '@/features/catalog/subject-types';
import type { CollectionStatus } from '@/features/watching/model';

const STATUS_OPTIONS: CollectionStatus[] = [
  'wish',
  'doing',
  'completed',
  'onHold',
  'dropped',
];

export function CollectionStatusPicker({
  currentStatus,
  onChange,
  onClose,
  subjectType,
  visible,
}: {
  currentStatus?: CollectionStatus | null;
  onChange: (status?: CollectionStatus) => void;
  onClose: () => void;
  subjectType: number;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="关闭收藏状态选择"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityRole="none"
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>收藏状态</Text>
          <View style={styles.options}>
            {STATUS_OPTIONS.map((status) => {
              const isSelected = currentStatus === status;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={status}
                  onPress={() => onChange(status)}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.selectedOptionText,
                    ]}
                  >
                    {getCollectionStatusLabel(subjectType, status)}
                  </Text>
                  {isSelected ? (
                    <SymbolView
                      name={{
                        android: 'check',
                        ios: 'checkmark',
                        web: 'check',
                      }}
                      size={16}
                      tintColor={COLORS.accent}
                      weight="bold"
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {currentStatus ? (
            <Pressable
              accessibilityLabel="取消收藏"
              accessibilityRole="button"
              onPress={() => onChange()}
              style={({ pressed }) => [
                styles.remove,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  android: 'bookmark_remove',
                  ios: 'bookmark.slash',
                  web: 'bookmark_remove',
                }}
                size={16}
                tintColor={COLORS.accent}
                weight="semibold"
              />
              <Text style={styles.removeText}>取消收藏</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    width: 36,
  },
  title: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  options: {
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  option: {
    alignItems: 'center',
    borderBottomColor: COLORS.track,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 4,
  },
  selectedOption: { backgroundColor: COLORS.accentSoft },
  optionText: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  selectedOptionText: { color: COLORS.accent, fontWeight: '800' },
  remove: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
  },
  removeText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.58 },
});
