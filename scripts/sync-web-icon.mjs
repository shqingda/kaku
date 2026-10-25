import { copyFile, mkdir } from 'node:fs/promises';

// The mobile artwork is the canonical source. The website keeps its existing
// public URL; its duplicate is generated for development and production builds.
const publicDirectory = new URL('../apps/web/public/', import.meta.url);
await mkdir(publicDirectory, { recursive: true });
await copyFile(
  new URL('../apps/mobile/assets/images/kaku-icon.png', import.meta.url),
  new URL('kaku-icon.png', publicDirectory),
);
