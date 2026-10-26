#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 只读报告：按名字的文本匹配判断引用，可能把同名符号误算为已使用，
// 所以结果只是清理候选，删除前仍需人工确认（框架约定和数据库 schema 例外）。
const SOURCE_ROOTS = ['apps/mobile/src', 'apps/api/src', 'packages/shared/src'];
const REFERENCE_ROOTS = [
  ...SOURCE_ROOTS, 'apps/web/src',
  'apps/mobile/tests', 'apps/api/tests', 'packages/shared/tests',
];
const SOURCE_FILE = /\.(?:ts|tsx|mjs|js)$/;
const EXPORT_DECLARATION = /^export (?:async )?(?:function|const|type|interface|class) ([A-Za-z0-9_]+)/gm;

function listFiles(root, dir) {
  const absolute = join(root, dir);
  let entries;
  try {
    entries = readdirSync(absolute);
  } catch {
    return [];
  }
  return entries.flatMap(name => {
    if (name === 'node_modules') return [];
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) return listFiles(root, path);
    return SOURCE_FILE.test(name) ? [path] : [];
  });
}

export function reportUnusedExports(root) {
  const files = REFERENCE_ROOTS.flatMap(dir => listFiles(root, dir));
  const text = new Map(files.map(path => [path, readFileSync(join(root, path), 'utf8')]));
  const report = { dead: [], fileLocal: [], testOnly: [] };

  for (const path of files.filter(file => SOURCE_ROOTS.some(dir => file.startsWith(`${dir}/`)))) {
    const source = text.get(path);
    for (const match of source.matchAll(EXPORT_DECLARATION)) {
      const name = match[1];
      const word = new RegExp(`\\b${name}\\b`);
      const users = files.filter(file => file !== path && word.test(text.get(file)));
      const line = source.slice(0, match.index).split('\n').length;
      const entry = `${path}:${line} ${name}`;
      if (users.length === 0) {
        const ownUses = source.match(new RegExp(`\\b${name}\\b`, 'g')).length;
        (ownUses > 1 ? report.fileLocal : report.dead).push(entry);
      } else if (users.every(file => file.includes('/tests/'))) {
        report.testOnly.push(entry);
      }
    }
  }
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const report = reportUnusedExports(root);
  for (const [label, entries] of Object.entries({
    '无任何引用': report.dead,
    '仅本文件使用（可去掉 export）': report.fileLocal,
    '仅测试使用': report.testOnly,
  })) {
    console.log(`\n${label}：${entries.length}`);
    for (const entry of entries) console.log(`  ${relative(root, join(root, entry))}`);
  }
}
