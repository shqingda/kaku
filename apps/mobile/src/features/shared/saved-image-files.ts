import { Directory, File, Paths } from 'expo-file-system';
import { Asset } from 'expo-media-library';

import { recordDiagnosticError } from '@/lib/diagnostic-log';

const activeFiles = new Set<string>();
let sequence = 0;

export async function saveImageToLibrary(url: string): Promise<void> {
  const extension = url.match(/\.(png|webp|jpe?g)(?:\?|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const file = new File(Paths.cache, `kaku-image-${Date.now()}-${sequence++}.${extension}`);
  activeFiles.add(file.uri);
  try {
    const downloaded = await File.downloadFileAsync(url, file);
    await Asset.create(downloaded.uri);
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // The library may already contain the image; cleanup is a separate failure.
      await recordDiagnosticError(new Error('图片临时文件未能清理')).catch(() => {});
    } finally {
      activeFiles.delete(file.uri);
    }
  }
}

export async function clearSavedImageFiles(): Promise<void> {
  for (const entry of new Directory(Paths.cache).list()) {
    if (entry instanceof File && /^kaku-image-\d+(?:-\d+)?\.(png|webp|jpe?g)$/i.test(entry.name)
      && !activeFiles.has(entry.uri)) {
      entry.delete();
    }
  }
}
