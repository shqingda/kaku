#!/usr/bin/env node
// Kaku 图标「格」：格（kaku）是格子，也是追番的剧集进度。
// 九宫格按阅读顺序：前 4 格已看（玫瑰色），第 5 格正在看（琥珀色液面半满），
// 后 4 格未看。所有 PNG 都由本文件里的矢量定义生成，改设计只改这里。
//
// 运行：pnpm --filter @kaku/mobile icons
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(ROOT, 'assets', 'images');
const OUTPUT = path.join(IMAGES, 'app-icons');
const SIZE = 1024;

const INK = '#1C181F';
const CHANNELS = { production: null, debug: 'DEBUG' };

// 九宫格几何按「格边长」等比缩放：格间距 = 0.2 格，圆角 = 0.27 格。
function gridGeometry(side) {
  const cell = side / (3 + 2 * 0.2);
  return { cell, gap: cell * 0.2, radius: cell * 0.27 };
}

function cells(side) {
  const { cell, gap, radius } = gridGeometry(side);
  const origin = (SIZE - side) / 2;
  return Array.from({ length: 9 }, (_, index) => ({
    index,
    x: origin + (index % 3) * (cell + gap),
    y: origin + Math.floor(index / 3) * (cell + gap),
    size: cell,
    radius,
  }));
}

// 「正在看」格子的液面：略带弧度的波峰，读作「进行中」而不是静态的一半。
function liquidPath({ x, y, size }) {
  const level = y + size * 0.44;
  const swell = size * 0.09;
  return [
    `M${x} ${level}`,
    `C${x + size * 0.32} ${level - swell} ${x + size * 0.62} ${level + swell} ${x + size} ${level - swell * 0.2}`,
    `V${y + size} H${x} Z`,
  ].join(' ');
}

const COLOR_DEFS = `
  <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2B2531"/><stop offset="1" stop-color="#121015"/>
  </linearGradient>
  <radialGradient id="halo" cx="0.5" cy="0.47" r="0.5">
    <stop offset="0" stop-color="#D0657A" stop-opacity="0.22"/><stop offset="1" stop-color="#D0657A" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="watched" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F7AAB5"/><stop offset="1" stop-color="#CC6278"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="watching" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE7AE"/><stop offset="1" stop-color="#FFBE6E"/>
  </linearGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="${SIZE * 0.014}" stdDeviation="${SIZE * 0.018}" flood-color="#000000" flood-opacity="0.45"/>
  </filter>`;

function colorGrid(side) {
  return cells(side)
    .map((tile) => {
      const { index, x, y, size, radius } = tile;
      const box = `x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}"`;
      if (index < 4) {
        return `<rect ${box} fill="url(#watched)"/><rect ${box} fill="url(#sheen)"/>`;
      }
      if (index === 4) {
        return `<clipPath id="now"><rect ${box}/></clipPath>
          <rect ${box} fill="#FFFFFF" fill-opacity="0.1"/>
          <path clip-path="url(#now)" d="${liquidPath(tile)}" fill="url(#watching)"/>`;
      }
      const inset = size * 0.018;
      return `<rect x="${x + inset}" y="${y + inset}" width="${size - inset * 2}" height="${size - inset * 2}"
        rx="${radius - inset}" fill="#FFFFFF" fill-opacity="0.06" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="${inset * 2}"/>`;
    })
    .join('');
}

// 单色版（Android 主题图标、通知图标）：只靠形状区分，不能依赖颜色或半透明。
function monochromeGrid(side) {
  return cells(side)
    .map((tile) => {
      const { index, x, y, size, radius } = tile;
      const stroke = size * 0.085;
      const outline = `<rect x="${x + stroke / 2}" y="${y + stroke / 2}" width="${size - stroke}" height="${size - stroke}"
        rx="${radius - stroke / 2}" fill="none" stroke="#FFFFFF" stroke-width="${stroke}"/>`;
      if (index < 4) return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="#FFFFFF"/>`;
      if (index === 4) {
        return `<clipPath id="now"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}"/></clipPath>
          ${outline}<path clip-path="url(#now)" d="${liquidPath(tile)}" fill="#FFFFFF"/>`;
      }
      return outline;
    })
    .join('');
}

function badge(label, { adaptive }) {
  if (!label) return '';
  // 渠道角标：贴右边缘的琥珀色条，自适应图标收进安全区内。
  const top = adaptive ? 600 : 690;
  const height = adaptive ? 150 : 210;
  const fontSize = adaptive ? 92 : 128;
  const textRight = adaptive ? 790 : 970;
  const width = label.length * fontSize * 0.68 + fontSize * 0.9;
  const left = textRight - width + fontSize * 0.45;
  return `<rect x="${left}" y="${top}" width="${SIZE - left}" height="${height}" fill="#FFBE6E"/>
    <text x="${textRight}" y="${top + height / 2}" text-anchor="end" dominant-baseline="central"
      font-family="SF Pro Rounded, Arial Rounded MT Bold, Helvetica Neue, Arial" font-weight="700"
      font-size="${fontSize}" letter-spacing="${fontSize * 0.04}" fill="${INK}">${label}</text>`;
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><defs>${COLOR_DEFS}</defs>${body}</svg>`;

const background = `<rect width="${SIZE}" height="${SIZE}" fill="url(#ink)"/><rect width="${SIZE}" height="${SIZE}" fill="url(#halo)"/>`;

// iOS / 官网 / 应用内：满版方图，系统自己裁圆角。格子占画面约 59%。
const FULL_ICON_GRID = 600;
// 启动屏与通知：透明画布上只放格子，几乎铺满。
const MARK_GRID = 940;
// Android 自适应前景：九宫格对角线必须落在 66dp/108dp 的安全圆内。
const ADAPTIVE_GRID = 430;

// mode: 'opaque' 满版无透明；'alpha' 保留透明；'mask' 把白色亮度转成白色图形的透明度（单色层）。
async function render(file, markup, mode) {
  const source = sharp(Buffer.from(markup), { density: 72 });
  if (mode === 'opaque') {
    await source.flatten({ background: INK }).png({ compressionLevel: 9 }).toFile(file);
  } else if (mode === 'mask') {
    const alpha = await source.flatten({ background: '#000000' }).greyscale().raw().toBuffer();
    await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#FFFFFF' } })
      .joinChannel(alpha, { raw: { width: SIZE, height: SIZE, channels: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(file);
  } else {
    await source.png({ compressionLevel: 9 }).toFile(file);
  }
  console.log(path.relative(ROOT, file));
}

function icons() {
  const outputs = [
    [path.join(IMAGES, 'kaku-icon.png'), svg(`${background}<g filter="url(#lift)">${colorGrid(FULL_ICON_GRID)}</g>`), 'opaque'],
    [path.join(IMAGES, 'kaku-mark.png'), svg(colorGrid(MARK_GRID)), 'alpha'],
    [path.join(IMAGES, 'kaku-mark-monochrome.png'), svg(monochromeGrid(MARK_GRID)), 'mask'],
  ];
  for (const [channel, label] of Object.entries(CHANNELS)) {
    outputs.push(
      [
        path.join(OUTPUT, `kaku-${channel}.png`),
        svg(`${background}<g filter="url(#lift)">${colorGrid(FULL_ICON_GRID)}</g>${badge(label, { adaptive: false })}`),
        'opaque',
      ],
      [
        path.join(OUTPUT, `kaku-${channel}-foreground.png`),
        svg(`<g filter="url(#lift)">${colorGrid(ADAPTIVE_GRID)}</g>${badge(label, { adaptive: true })}`),
        'alpha',
      ],
      [
        path.join(OUTPUT, `kaku-${channel}-monochrome.png`),
        svg(`${monochromeGrid(ADAPTIVE_GRID)}${badge(label, { adaptive: true }).replaceAll('#FFBE6E', '#FFFFFF').replaceAll(`fill="${INK}"`, 'fill="#000000"')}`),
        'mask',
      ],
    );
  }
  return outputs;
}

async function main() {
  await mkdir(OUTPUT, { recursive: true });
  for (const [file, markup, mode] of icons()) await render(file, markup, mode);
}

await main();
