import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/design';

type RatingStarsProps = {
  rating: number;
  size?: number;
};

export function RatingStars({ rating, size = 14 }: RatingStarsProps) {
  const fivePointRating = Math.max(0, Math.min(5, rating / 2));

  return (
    <View
      accessibilityLabel={`${fivePointRating} 星`}
      accessibilityRole="image"
      style={styles.row}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starNumber = index + 1;
        const isFull = fivePointRating >= starNumber;
        const isHalf =
          !isFull && fivePointRating >= starNumber - 0.5;

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
            tintColor={isFull || isHalf ? COLORS.accent : COLORS.subtle}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
});
