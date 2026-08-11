import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function saveCover() {
    if (!coverUrl || isSaving) return;

    setIsSaving(true);

    try {
      const permission = await requestPermissionsAsync(true, ['photo']);

      if (!permission.granted) {
        Alert.alert('无法保存封面', '请在系统设置中允许 Kaku 添加照片。');
        return;
      }

      const extension =
        coverUrl.match(/\.(png|webp|jpe?g)(?:\?|$)/i)?.[1]?.toLowerCase() ??
        'jpg';
      const file = new File(
        Paths.cache,
        `kaku-cover-${Date.now()}.${extension}`,
      );
      const downloaded = await File.downloadFileAsync(coverUrl, file);

      await Asset.create(downloaded.uri);
      Alert.alert('已保存', '封面已保存到系统相册。');
    } catch {
      Alert.alert('封面保存失败', '图片服务暂时没有响应，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <View style={styles.hero}>
        <Pressable
          accessibilityLabel="全屏查看封面"
          accessibilityRole="button"
          disabled={!coverUrl}
          onPress={() => setIsPreviewVisible(true)}
          style={({ pressed }) => [
            styles.coverFrame,
            pressed && styles.pressed,
          ]}
        >
          <View pointerEvents="none">
            <Link.AppleZoomTarget>
              <View style={styles.cover}>
                <Text style={styles.coverFallback}>{title.slice(0, 1)}</Text>
                {coverUrl ? (
                  <Image
                    contentFit="cover"
                    source={coverUrl}
                    style={StyleSheet.absoluteFill}
                    transition={180}
                  />
                ) : null}
              </View>
            </Link.AppleZoomTarget>
          </View>
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Text selectable style={styles.title}>
          {title}
        </Text>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsPreviewVisible(false)}
        statusBarTranslucent
        visible={isPreviewVisible}
      >
        <View style={styles.preview}>
          {coverUrl ? (
            <Image
              contentFit="contain"
              source={coverUrl}
              style={styles.previewImage}
            />
          ) : null}
          <Pressable
            accessibilityLabel="关闭封面预览"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsPreviewVisible(false)}
            style={({ pressed }) => [
              styles.previewClose,
              { top: insets.top + 10 },
              pressed && styles.previewPressed,
            ]}
          >
            <SymbolView
              name={{ android: 'close', ios: 'xmark', web: 'close' }}
              size={17}
              tintColor="#FFFFFF"
              weight="semibold"
            />
          </Pressable>
          <Pressable
            accessibilityLabel="下载封面"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void saveCover()}
            style={({ pressed }) => [
              styles.downloadButton,
              { bottom: insets.bottom + 22 },
              (pressed || isSaving) && styles.previewPressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <SymbolView
                name={{
                  android: 'download',
                  ios: 'arrow.down.to.line',
                  web: 'download',
                }}
                size={17}
                tintColor="#FFFFFF"
                weight="semibold"
              />
            )}
            <Text style={styles.downloadText}>{isSaving ? '保存中' : '下载'}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 8 },
  coverFrame: { borderCurve: 'continuous', borderRadius: 24 },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderCurve: 'continuous',
    borderRadius: 24,
    height: 238,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 170,
  },
  pressed: { opacity: 0.78 },
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
  preview: { backgroundColor: '#000000', flex: 1 },
  previewImage: { flex: 1, marginHorizontal: 12, marginVertical: 72 },
  previewClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 38, 40, 0.78)',
    borderCurve: 'continuous',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 40,
  },
  downloadButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(38, 38, 40, 0.86)',
    borderCurve: 'continuous',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 18,
    position: 'absolute',
  },
  downloadText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  previewPressed: { opacity: 0.62 },
});
