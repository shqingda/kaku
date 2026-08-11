import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
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

export function FullscreenImageViewer({
  onClose,
  title,
  url,
  visible,
}: {
  onClose: () => void;
  title: string;
  url?: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);

  async function saveImage() {
    if (!url || isSaving) return;

    setIsSaving(true);

    try {
      const permission = await requestPermissionsAsync(true, ['photo']);

      if (!permission.granted) {
        Alert.alert('无法保存图片', '请在系统设置中允许 Kaku 添加照片。');
        return;
      }

      const extension =
        url.match(/\.(png|webp|jpe?g)(?:\?|$)/i)?.[1]?.toLowerCase() ??
        'jpg';
      const file = new File(
        Paths.cache,
        `kaku-image-${Date.now()}.${extension}`,
      );
      const downloaded = await File.downloadFileAsync(url, file);

      await Asset.create(downloaded.uri);
      Alert.alert('已保存', '图片已保存到系统相册。');
    } catch {
      Alert.alert('图片保存失败', '图片服务暂时没有响应，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      visible={visible}
    >
      <View style={styles.screen}>
        {url ? (
          <Image
            accessibilityLabel={`${title}图片`}
            contentFit="contain"
            source={url}
            style={styles.image}
          />
        ) : null}
        <Pressable
          accessibilityLabel="关闭图片预览"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [
            styles.close,
            { top: insets.top + 10 },
            pressed && styles.pressed,
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
          accessibilityLabel="下载图片"
          accessibilityRole="button"
          disabled={isSaving || !url}
          onPress={() => void saveImage()}
          style={({ pressed }) => [
            styles.download,
            { bottom: insets.bottom + 22 },
            (pressed || isSaving) && styles.pressed,
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
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000', flex: 1 },
  image: { flex: 1, marginHorizontal: 12, marginVertical: 72 },
  close: {
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
  download: {
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
  pressed: { opacity: 0.62 },
});
