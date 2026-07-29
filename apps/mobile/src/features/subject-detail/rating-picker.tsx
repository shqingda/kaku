import { SymbolView } from 'expo-symbols';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';

const RATING_OPTIONS = Array.from(
  { length: 10 },
  (_, index) => 10 - index,
);

export function RatingStars({
  rating,
  size = 15,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }, (_, starIndex) => {
        const fullRating = (starIndex + 1) * 2;
        const state =
          rating >= fullRating
            ? 'full'
            : rating === fullRating - 1
              ? 'half'
              : 'empty';

        return (
          <SymbolView
            key={starIndex}
            name={
              state === 'full'
                ? {
                    android: 'star',
                    ios: 'star.fill',
                    web: 'star',
                  }
                : state === 'half'
                  ? {
                      android: 'star_half',
                      ios: 'star.leadinghalf.filled',
                      web: 'star_half',
                    }
                  : {
                      android: 'star_border',
                      ios: 'star',
                      web: 'star_border',
                    }
            }
            size={size}
            tintColor={
              state === 'empty' ? COLORS.subtle : COLORS.accent
            }
            weight="medium"
          />
        );
      })}
    </View>
  );
}

export function RatingPicker({
  onChange,
  onClose,
  rating,
  visible,
}: {
  onChange: (rating?: number) => void;
  onClose: () => void;
  rating?: number;
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
        accessibilityLabel="关闭评分选择"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.modalBackdrop}
      >
        <Pressable
          accessibilityRole="none"
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.ratingSheet,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeading}>
            <View>
              <Text style={styles.sheetTitle}>我的评分</Text>
              <Text style={styles.sheetHint}>
                10 分对应五颗星，每 1 分对应半颗星
              </Text>
            </View>
            {rating ? (
              <Pressable
                accessibilityLabel="清除评分"
                hitSlop={8}
                onPress={() => onChange()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.clearRating}>清除</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            contentContainerStyle={styles.ratingOptions}
            showsVerticalScrollIndicator={false}
          >
            {RATING_OPTIONS.map((option) => {
              const isSelected = rating === option;

              return (
                <Pressable
                  accessibilityLabel={`${option} 分，${option / 2} 星`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option}
                  onPress={() => onChange(option)}
                  style={({ pressed }) => [
                    styles.ratingOption,
                    isSelected && styles.selectedRatingOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.ratingOptionHeading}>
                    <Text
                      style={[
                        styles.ratingOptionScore,
                        isSelected && styles.selectedRatingOptionText,
                      ]}
                    >
                      {option} 分
                    </Text>
                    <Text
                      style={[
                        styles.ratingOptionStars,
                        isSelected && styles.selectedRatingOptionText,
                      ]}
                    >
                      {Number.isInteger(option / 2)
                        ? option / 2
                        : (option / 2).toFixed(1)}{' '}
                      星
                    </Text>
                  </View>
                  <RatingStars rating={option} size={13} />
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  starRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  ratingSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    width: 36,
  },
  sheetHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  sheetHint: {
    color: COLORS.subtle,
    fontSize: 11,
    marginTop: 4,
  },
  clearRating: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingOption: {
    backgroundColor: '#F7F6F2',
    borderColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 7,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedRatingOption: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  ratingOptionHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingOptionScore: {
    color: COLORS.ink,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  ratingOptionStars: {
    color: COLORS.subtle,
    fontSize: 10,
    fontWeight: '700',
  },
  selectedRatingOptionText: { color: COLORS.accent },
  pressed: { opacity: 0.62 },
});
