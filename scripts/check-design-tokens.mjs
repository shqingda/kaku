#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 新代码的字号和间距必须用 TYPE. / SPACING.（AGENTS.md）。存量裸数字逐步迁移，
// 这里只做计数门槛：数量不能增加，减少后提示更新基线，不做通用 lint。
const PATTERNS = {
  fontSize: /\bfontSize:\s*\d/g,
  spacing: /\b(?:padding|margin|gap)[A-Za-z]*:\s*\d/g,
};
const BASELINE_URL = new URL('./baselines/design-tokens.json', import.meta.url);

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

export function countRawDesignValues(sourceDir) {
  const counts = Object.fromEntries(Object.keys(PATTERNS).map(key => [key, 0]));
  for (const file of listSourceFiles(sourceDir)) {
    const text = readFileSync(file, 'utf8');
    for (const [key, pattern] of Object.entries(PATTERNS)) {
      counts[key] += text.match(pattern)?.length ?? 0;
    }
  }
  return counts;
}

export function compareWithBaseline(counts, baseline) {
  return Object.entries(counts).map(([key, count]) => {
    if (!Number.isInteger(baseline?.[key])) throw new Error(`基线缺少 ${key}。`);
    return { key, count, baseline: baseline[key], increased: count > baseline[key], decreased: count < baseline[key] };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const results = compareWithBaseline(
    countRawDesignValues(join(root, 'apps/mobile/src')),
    JSON.parse(readFileSync(BASELINE_URL, 'utf8')),
  );
  console.table(results.map(({ key, count, baseline }) => ({ key, count, baseline })));
  if (results.some(result => result.increased)) {
    console.error('裸 fontSize / 间距数字增加了：新代码请使用 TYPE. / SPACING.（apps/mobile/src/constants/design.ts）。');
    process.exitCode = 1;
  } else if (results.some(result => result.decreased)) {
    console.log('数量已减少，请把 scripts/baselines/design-tokens.json 更新为当前值。');
  }
}
