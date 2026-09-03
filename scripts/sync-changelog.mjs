#!/usr/bin/env node
// 把 scripts/release-notes.md 的用户向条目同步进 App 内更新日志。
// 安装/覆盖提示只留给 GitHub Release，不会写进 changelog-data.ts。
// 当前版本已在日志最上方时不覆盖手改内容。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(SCRIPT_DIR, '..');
const CHANGELOG_PATH = path.join(
  REPO_DIR,
  'apps/mobile/src/features/changelog/changelog-data.ts',
);
const NOTES_PATH = path.join(REPO_DIR, 'scripts/release-notes.md');
const APP_CONFIG_PATH = path.join(REPO_DIR, 'apps/mobile/app.config.js');

const HEADER = `// 版本更新日志：发新版时由 scripts/sync-changelog.mjs 在最上面写入。
// 当前版本已存在时不会覆盖，所以仍可手改条目。
// 内容面向用户写「发生了什么变化」，不写重构、CI 等内部工作；
// date 是发布日期（YYYY-MM-DD），与 app.config.js 的 version 对应。
export type ChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

export const CHANGELOG: ChangelogEntry[] = `;

export function isInstallNote(line) {
  return /可直接覆盖安装|安装前请先卸载|签名与旧包不同/.test(line);
}

export function parseUserNotes(markdown) {
  const notes = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('- ')) continue;
    const text = line.slice(2).trim();
    if (!text || isInstallNote(text)) continue;
    notes.push(text);
  }
  return notes;
}

export function todayStamp(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseChangelogSource(source) {
  const entries = [];
  const objectRe =
    /\{\s*version:\s*'([^']+)',\s*date:\s*'([^']+)',\s*notes:\s*\[([\s\S]*?)\],\s*\}/g;
  let match = objectRe.exec(source);
  while (match) {
    const notes = [];
    const noteRe = /'((?:\\'|[^'])*)'/g;
    let noteMatch = noteRe.exec(match[3]);
    while (noteMatch) {
      notes.push(noteMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
      noteMatch = noteRe.exec(match[3]);
    }
    if (notes.length === 0) {
      throw new Error(`版本 ${match[1]} 没有说明`);
    }
    entries.push({ version: match[1], date: match[2], notes });
    match = objectRe.exec(source);
  }
  if (entries.length === 0) {
    throw new Error('无法解析 CHANGELOG 数组');
  }
  return entries;
}

function tsString(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function formatChangelogSource(entries) {
  const body = entries
    .map((entry) => {
      const notes = entry.notes.map((note) => `      ${tsString(note)},`).join('\n');
      return `  {\n    version: ${tsString(entry.version)},\n    date: ${tsString(entry.date)},\n    notes: [\n${notes}\n    ],\n  },`;
    })
    .join('\n');
  return `${HEADER}[\n${body}\n];\n`;
}

export function syncChangelogEntries(entries, { version, date, notes }) {
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`无效的版本号: ${version || '(空)'}`);
  }
  if (notes.length === 0) {
    throw new Error('release-notes.md 里没有可写入 App 的用户向条目');
  }

  const existingIndex = entries.findIndex((entry) => entry.version === version);
  if (existingIndex === 0) {
    return { entries, didInsert: false };
  }
  if (existingIndex > 0) {
    throw new Error(
      `版本 ${version} 已在更新日志里，但不在最上方（当前位置 ${existingIndex}）`,
    );
  }

  return {
    entries: [{ version, date, notes }, ...entries],
    didInsert: true,
  };
}

export function syncChangelogFiles({
  version,
  date = todayStamp(),
  notesMarkdown,
  changelogSource,
}) {
  const notes = parseUserNotes(notesMarkdown);
  const parsed = parseChangelogSource(changelogSource);
  const result = syncChangelogEntries(parsed, { version, date, notes });
  return {
    changelogSource: formatChangelogSource(result.entries),
    didInsert: result.didInsert,
  };
}

function readAppVersion() {
  return require(APP_CONFIG_PATH).expo.version;
}

function main() {
  const version = readAppVersion();
  const notesMarkdown = fs.readFileSync(NOTES_PATH, 'utf8');
  const changelogSource = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const result = syncChangelogFiles({ version, notesMarkdown, changelogSource });
  if (!result.didInsert) {
    console.log(`更新日志已包含 v${version}，未改写`);
    return;
  }
  fs.writeFileSync(CHANGELOG_PATH, result.changelogSource);
  console.log(`已写入 App 内更新日志 v${version}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}
