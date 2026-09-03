import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

type RatingStarsProps = {
  rating: number;
  size?: number;
};

export function RatingStars({ rating, size = 14 }: RatingStarsProps) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const fivePointRating = Math.max(0, Math.min(5, rating / 2));

  return (
    <View
      accessibilityLabel={`${fivePointRating} 星`}
      accessibilityRole="image"
      style={styles.row}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(
          0,
          Math.min(1, fivePointRating - index),
        );
        const starNumber = index + 1;
        const isFull = fivePointRating >= starNumber;
        const isHalf =
          !isFull && fivePointRating >= starNumber - 0.5;

        if (Platform.OS === 'android') {
          return (
            <View
              key={starNumber}
              style={{ height: size, width: size }}
            >
              <Text
                style={[
                  styles.androidStar,
                  {
                    color: colors.subtle,
                    fontSize: size,
                    lineHeight: size,
                  },
                ]}
              >
                ☆
              </Text>
              {fill > 0 ? (
                <View
                  style={[
                    styles.androidStarFill,
                    { width: size * fill },
                  ]}
                >
                  <Text
                    style={[
                      styles.androidStar,
                      {
                        color: colors.accent,
                        fontSize: size,
                        lineHeight: size,
                        width: size,
                      },
                    ]}
                  >
                    ★
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }

        return (
          <SymbolView
            key={starNumber}
            name={
              isFull
                ? { android: 'star', ios: 'star.fill', web: 'star' }
                : isHalf
                  ? {
                      android: 'star_half',
                      ios: 'star.leadinghalf.filled',
                      web: 'star_half',
                    }
                  : {
                      android: 'star_outline',
                      ios: 'star',
                      web: 'star_outline',
                    }
            }
            size={size}
            tintColor={isFull || isHalf ? colors.accent : colors.subtle}
          />
        );
      })}
    </View>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  androidStar: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  androidStarFill: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  row: { flexDirection: 'row', gap: 1 },
});
