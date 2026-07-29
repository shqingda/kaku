import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';

export function SubjectHero({
  coverUrl,
  title,
  year,
}: {
  coverUrl?: string;
  title: string;
  year?: number;
}) {
  const [isSharing, setIsSharing] = useState(false);

  async function shareCover() {
    if (!coverUrl || isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('暂时无法分享封面', '当前设备不支持系统分享。');
        return;
      }

      const extension =
        coverUrl.match(/\.(png|webp|jpe?g)(?:\?|$)/i)?.[1]?.toLowerCase() ??
        'jpg';
      const file = new File(Paths.cache, `kaku-cover.${extension}`);
      const downloaded = await File.downloadFileAsync(coverUrl, file, {
        idempotent: true,
      });

      await Sharing.shareAsync(downloaded.uri, {
        dialogTitle: '保存或分享封面',
        mimeType:
          extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/jpeg',
        UTI: 'public.image',
      });
    } catch {
      Alert.alert(
        '封面下载失败',
        'Bangumi 图片服务暂时没有响应，请稍后重试。',
      );
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <View style={styles.hero}>
      <View style={styles.coverFrame}>
        <View pointerEvents="none">
          <Link.AppleZoomTarget>
            <View style={styles.cover}>
              <Text style={styles.coverFallback}>{title.slice(0, 1)}</Text>
              <Image
                contentFit="cover"
                source={coverUrl}
                style={StyleSheet.absoluteFill}
                transition={180}
              />
            </View>
          </Link.AppleZoomTarget>
        </View>
        {coverUrl ? (
          <Pressable
            accessibilityLabel="保存、复制或分享封面"
            accessibilityRole="button"
            disabled={isSharing}
            hitSlop={8}
            onPress={() => void shareCover()}
            style={({ pressed }) => [
              styles.shareButton,
              (pressed || isSharing) && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                android: 'share',
                ios: 'square.and.arrow.up',
                web: 'share',
              }}
              size={16}
              tintColor={COLORS.ink}
              weight="semibold"
            />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.year}>{year}</Text>
      <Text selectable style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 8 },
  coverFrame: { position: 'relative' },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 24,
    height: 238,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 170,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(29, 29, 31, 0.08)',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 10,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    width: 34,
  },
  pressed: { opacity: 0.58 },
  coverFallback: { color: COLORS.subtle, fontSize: 30, fontWeight: '700' },
  year: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginTop: 22 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 7,
    textAlign: 'center',
  },
});
