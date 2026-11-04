#!/usr/bin/env node
// Kaku 应用图标：三套字标，全部由本文件的矢量定义生成。
//   ink   墨：KA / KU 两行叠排，墨色，第二个 K 的下三角用玫瑰色点题（默认图标）
//   color 彩：同样的叠排，墨、玫瑰、琥珀三色几何构成
//   lower 小写：一行小写 kaku，圆头笔画，a 用玫瑰色
// 每套输出 iOS 浅色 / 深色 / 着色、Android 前景 / 单色，production 与 debug 各一份。
//
// 运行：pnpm --filter @kaku/mobile icons
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = path.join(ROOT, 'assets', 'images');
const OUTPUT = path.join(IMAGES, 'app-icons');
const PREVIEWS = path.join(OUTPUT, 'previews');
const SIZE = 1024;
const DEFAULT_ICON = 'ink';
const CHANNELS = { production: null, debug: 'DEBUG' };

// 配色：浅色底、深色底、着色（iOS 只读亮度，再由系统染色）。
const SCHEMES = {
  light: { background: '#FFFFFF', ink: '#1F1A24', rose: '#E0607A', amber: '#F4B35E' },
  dark: { background: '#16131A', ink: '#F4F0EB', rose: '#F07C93', amber: '#F7BE6B' },
  tinted: { background: '#000000', ink: '#FFFFFF', rose: '#B8B8B8', amber: '#DADADA' },
  silhouette: { background: 'none', ink: '#FFFFFF', rose: '#FFFFFF', amber: '#FFFFFF' },
};

const poly = (points) => `M${points.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;

// ---- 叠排字标的几何（设计单位）：格高 300，笔画 84 ----
const CELL = 300;
const STROKE = 84;
const A_WIDTH = 340;
const COLUMN_GAP = 32;
const ROW_GAP = 44;

// K：竖杆加上下两块三角，两块三角之间的白色楔形就是 K 的开口。
function letterK(x, y, fills) {
  return [
    `<path d="${poly([[x, y], [x + STROKE + 1, y], [x + STROKE + 1, y + CELL], [x, y + CELL]])}" fill="${fills.stem}"/>`,
    `<path d="${poly([[x + STROKE, y], [x + CELL, y], [x + STROKE, y + CELL / 2]])}" fill="${fills.top}"/>`,
    `<path d="${poly([[x + STROKE, y + CELL / 2], [x + CELL, y + CELL], [x + STROKE, y + CELL]])}" fill="${fills.bottom}"/>`,
  ].join('');
}

// A：实心三角，挖出三角内孔和梯形开口，留下横杠；尖顶上冲 12 做光学补偿。
function letterA(x, y, fill) {
  const center = x + A_WIDTH / 2;
  const top = y - 12;
  const slope = A_WIDTH / 2 / (y + CELL - top); // 每下降 1 单位，半宽增加多少
  const leg = STROKE / Math.cos(Math.atan(slope)); // 斜笔画的水平厚度
  const innerApex = top + leg / slope;
  const halfAt = (yy) => (yy - innerApex) * slope;
  const barTop = y + 196;
  const barBottom = barTop + STROKE * 0.62;
  const outer = poly([
    [center, top],
    [x + A_WIDTH, y + CELL],
    [center + halfAt(y + CELL), y + CELL],
    [center + halfAt(barBottom), barBottom],
    [center - halfAt(barBottom), barBottom],
    [center - halfAt(y + CELL), y + CELL],
    [x, y + CELL],
  ]);
  const counter = poly([[center, innerApex], [center + halfAt(barTop), barTop], [center - halfAt(barTop), barTop]]);
  return `<path fill-rule="evenodd" d="${outer} ${counter}" fill="${fill}"/>`;
}

// U：两根竖杆接半圆底，底部比基线多出 8 做光学补偿。
function letterU(x, y, fill) {
  const width = CELL;
  const outer = width / 2;
  const inner = outer - STROKE;
  const bend = y + CELL + 8 - outer;
  return `<path d="M${x} ${y} V${bend} A${outer} ${outer} 0 0 0 ${x + width} ${bend} V${y} H${x + width - STROKE} V${bend} A${inner} ${inner} 0 0 1 ${x + STROKE} ${bend} V${y} Z" fill="${fill}"/>`;
}

function stackedGlyph(colors, variant) {
  const right = CELL + COLUMN_GAP;
  const lower = CELL + ROW_GAP;
  const kFills = variant === 'color'
    ? { stem: colors.ink, top: colors.rose, bottom: colors.amber }
    : { stem: colors.ink, top: colors.ink, bottom: colors.ink };
  const secondK = variant === 'color' ? kFills : { ...kFills, bottom: colors.rose };
  return {
    width: right + A_WIDTH,
    top: -12,
    height: lower + CELL + 8 + 12,
    body: [
      letterK(0, 0, kFills),
      letterA(right, 0, colors.ink),
      letterK(0, lower, secondK),
      letterU(right + (A_WIDTH - CELL) / 2, lower, variant === 'color' ? colors.rose : colors.ink),
    ].join(''),
  };
}

// ---- 小写 kaku（笔画中心线坐标，基线 y=0）----
const LOWER_STROKE = 64;
const X_HEIGHT = 170;
const ASCENDER = 292;
const BOWL = X_HEIGHT / 2;
const SIDE_GAP = 46;

function lowercaseGlyph(colors) {
  const stroke = (color) => `fill="none" stroke="${color}" stroke-width="${LOWER_STROKE}" stroke-linecap="round" stroke-linejoin="round"`;
  const half = LOWER_STROKE / 2;
  const k = (x) => [
    `<path d="M${x} ${-ASCENDER} V0" ${stroke(colors.ink)}/>`,
    `<path d="M${x + 122} ${-X_HEIGHT} L${x + 6} ${-68}" ${stroke(colors.ink)}/>`,
    `<path d="M${x + 50} ${-110} L${x + 126} 0" ${stroke(colors.ink)}/>`,
  ].join('');
  const a = (x) => [
    `<circle cx="${x + BOWL}" cy="${-BOWL}" r="${BOWL}" ${stroke(colors.rose)}/>`,
    `<path d="M${x + BOWL * 2} ${-X_HEIGHT} V0" ${stroke(colors.rose)}/>`,
  ].join('');
  const u = (x) => `<path d="M${x} ${-X_HEIGHT} V${-BOWL} A${BOWL} ${BOWL} 0 0 0 ${x + BOWL * 2} ${-BOWL} V${-X_HEIGHT} M${x + BOWL * 2} ${-X_HEIGHT} V0" ${stroke(colors.ink)}/>`;
  const kWidth = 126;
  const roundWidth = BOWL * 2;
  const x1 = 0;
  const x2 = x1 + kWidth + half * 2 + SIDE_GAP;
  const x3 = x2 + roundWidth + half * 2 + SIDE_GAP;
  const x4 = x3 + kWidth + half * 2 + SIDE_GAP;
  return {
    left: -half,
    width: x4 + roundWidth + half * 2,
    top: -ASCENDER - half,
    height: ASCENDER + half * 2,
    // 小写字有上伸部，按 x 高度的中线居中会显得偏下，往上收一点。
    lift: 24,
    body: k(x1) + a(x2) + k(x3) + u(x4),
  };
}

const ICONS = {
  ink: (colors) => stackedGlyph(colors, 'ink'),
  color: (colors) => stackedGlyph(colors, 'color'),
  lower: (colors) => lowercaseGlyph(colors),
};

// 把字标等比缩放进 box（最大宽 / 高），放在画布中心。
function place(glyph, box) {
  const scale = Math.min(box.width / glyph.width, box.height / glyph.height);
  const x = SIZE / 2 - (glyph.width / 2 + (glyph.left ?? 0)) * scale;
  const y = SIZE / 2 - (glyph.height / 2 + glyph.top) * scale - (glyph.lift ?? 0) * scale;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})">${glyph.body}</g>`;
}

// 满版图标里字标占多大：叠排约 62%，小写一行约 76% 宽。
const FULL_BOX = { width: 640, height: 640 };
const FULL_BOX_WIDE = { width: 780, height: 640 };
// Android 自适应前景：字标外接矩形的对角线落在 66dp/108dp 的安全圆内。
const ADAPTIVE_BOX = { width: 400, height: 400 };
const ADAPTIVE_BOX_WIDE = { width: 540, height: 280 };
// 启动屏与通知：透明画布上几乎铺满。
const MARK_BOX = { width: 960, height: 960 };

const boxFor = (id, kind) => {
  const wide = id === 'lower';
  if (kind === 'full') return wide ? FULL_BOX_WIDE : FULL_BOX;
  if (kind === 'adaptive') return wide ? ADAPTIVE_BOX_WIDE : ADAPTIVE_BOX;
  return MARK_BOX;
};

function badge(label, { adaptive, scheme }) {
  if (!label) return '';
  const colors = SCHEMES[scheme];
  // 渠道角标贴右边缘，自适应图标收进安全区。
  const top = adaptive ? 640 : 760;
  const height = adaptive ? 130 : 180;
  const fontSize = adaptive ? 80 : 112;
  const textRight = adaptive ? 790 : 968;
  const left = textRight - label.length * fontSize * 0.68 - fontSize * 0.45;
  return `<rect x="${left}" y="${top}" width="${SIZE - left}" height="${height}" fill="${colors.ink}"/>
    <text x="${textRight}" y="${top + height / 2}" text-anchor="end" dominant-baseline="central"
      font-family="SF Pro Rounded, Arial Rounded MT Bold, Helvetica Neue, Arial" font-weight="700"
      font-size="${fontSize}" letter-spacing="${fontSize * 0.04}" fill="${colors.background}">${label}</text>`;
}

const svg = (body, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${
    background === 'none' ? '' : `<rect width="${SIZE}" height="${SIZE}" fill="${background}"/>`
  }${body}</svg>`;

// mode：opaque 满版无透明；alpha 保留透明；mask 把白色亮度转成白色图形的透明度（单色层）。
async function render(file, markup, mode, size = SIZE) {
  let source = sharp(Buffer.from(markup), { density: 72 });
  if (mode === 'mask') {
    const alpha = await source.flatten({ background: '#000000' }).greyscale().raw().toBuffer();
    source = sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#FFFFFF' } })
      .joinChannel(alpha, { raw: { width: SIZE, height: SIZE, channels: 1 } });
  } else if (mode === 'opaque') {
    source = source.flatten({ background: '#FFFFFF' });
  }
  if (size !== SIZE) source = sharp(await source.png().toBuffer()).resize(size, size);
  await source.png({ compressionLevel: 9 }).toFile(file);
  console.log(path.relative(ROOT, file));
}

function outputs() {
  const list = [];
  for (const [id, draw] of Object.entries(ICONS)) {
    for (const [channel, label] of Object.entries(CHANNELS)) {
      const name = (variant) => path.join(OUTPUT, `kaku-${id}-${channel}-${variant}.png`);
      for (const scheme of ['light', 'dark', 'tinted']) {
        const colors = SCHEMES[scheme];
        const tag = scheme === 'tinted' ? '' : badge(label, { adaptive: false, scheme });
        list.push([name(`ios-${scheme}`), svg(place(draw(colors), boxFor(id, 'full')) + tag, colors.background), 'opaque']);
      }
      list.push([
        name('foreground'),
        svg(place(draw(SCHEMES.light), boxFor(id, 'adaptive')) + badge(label, { adaptive: true, scheme: 'light' }), 'none'),
        'alpha',
      ]);
      const monoBadge = label
        ? badge(label, { adaptive: true, scheme: 'light' }).replace(`fill="${SCHEMES.light.ink}"`, 'fill="#FFFFFF"').replace(`fill="${SCHEMES.light.background}"`, 'fill="#000000"')
        : '';
      list.push([name('monochrome'), svg(place(draw(SCHEMES.silhouette), boxFor(id, 'adaptive')) + monoBadge, '#000000'), 'mask']);
    }
    // 图标切换页里的缩略图：浅色 / 深色界面各一张，180px 足够 3x 屏上的 60pt。
    for (const scheme of ['light', 'dark']) {
      const colors = SCHEMES[scheme];
      list.push([path.join(PREVIEWS, `${id}-${scheme}.png`), svg(place(draw(colors), boxFor(id, 'full')), colors.background), 'opaque', 180]);
    }
  }
  const mark = ICONS[DEFAULT_ICON];
  list.push(
    [path.join(IMAGES, 'kaku-icon.png'), svg(place(mark(SCHEMES.light), boxFor(DEFAULT_ICON, 'full')), SCHEMES.light.background), 'opaque'],
    [path.join(IMAGES, 'kaku-mark.png'), svg(place(mark(SCHEMES.light), MARK_BOX), 'none'), 'alpha'],
    [path.join(IMAGES, 'kaku-mark-dark.png'), svg(place(mark(SCHEMES.dark), MARK_BOX), 'none'), 'alpha'],
    [path.join(IMAGES, 'kaku-mark-monochrome.png'), svg(place(mark(SCHEMES.silhouette), MARK_BOX), '#000000'), 'mask'],
  );
  return list;
}

await mkdir(PREVIEWS, { recursive: true });
for (const [file, markup, mode, size] of outputs()) await render(file, markup, mode, size);
