import { copyFile, mkdir } from 'node:fs/promises';

// The mobile artwork is the canonical source. The website keeps its existing
// public URL; its duplicates are generated for development and production builds.
const images = new URL('../apps/mobile/assets/images/', import.meta.url);
const publicDirectory = new URL('../apps/web/public/', import.meta.url);
const iconDirectory = new URL('app-icons/', publicDirectory);
await mkdir(iconDirectory, { recursive: true });
await copyFile(new URL('kaku-icon.png', images), new URL('kaku-icon.png', publicDirectory));

// The home page shows every selectable app icon in both themes.
for (const variant of ['ink', 'color', 'lower']) {
  for (const theme of ['light', 'dark']) {
    const name = `${variant}-${theme}.png`;
    await copyFile(new URL(`app-icons/previews/${name}`, images), new URL(name, iconDirectory));
  }
}
