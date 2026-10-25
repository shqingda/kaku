#!/usr/bin/env node
import { lstatSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 白名单只用于盘点，不能据此判断某个目录可以删除。
const ROOTS = {
  source: [
    'apps/mobile/src', 'apps/mobile/assets', 'apps/mobile/config', 'apps/mobile/plugins',
    'apps/api/src', 'apps/api/migrations', 'apps/web/src',
    'apps/web/public/robots.txt', 'apps/web/public/sitemap.xml',
    'packages/shared/src', 'scripts', 'patches', 'docs',
  ],
  artifact: [
    'apps/mobile/.expo', 'apps/mobile/android/.gradle', 'apps/mobile/android/app/.cxx',
    'apps/mobile/android/app/build/intermediates', 'apps/mobile/android/build/generated',
    'apps/web/dist', 'apps/web/tsconfig.tsbuildinfo', 'apps/web/public/kaku-icon.png',
    'coverage', 'apps/mobile/coverage', 'apps/api/coverage',
  ],
  dependency: [
    'node_modules', 'apps/mobile/node_modules', 'apps/api/node_modules',
    'apps/web/node_modules', 'packages/shared/node_modules', 'apps/mobile/ios/Pods',
  ],
};

function isProtected(name) {
  return /^(?:tutorial|\.git|coresimulator|simulators?|devices|signing|credentials)$/i.test(name)
    || /^(?:\.env(?:\.|$)|\.xcode\.env(?:\.|$)|credentials(?:\.|$)|google-services\.json$)/i.test(name)
    || /\.(?:apk|aab|ipa|app|jks|keystore|p8|p12|key|pem|mobileprovision|provisionprofile|cer|crt)$/i.test(name);
}

function inspectEntry(root, path, category) {
  const entry = { path, category, status: 'present', files: 0, logicalBytes: 0, excludedEntries: 0, unreadableEntries: 0 };
  let absolute = root;
  try {
    // 每个祖先都检查，避免白名单路径通过一个父目录链接逃出仓库。
    for (const part of path.split('/')) {
      absolute = join(absolute, part);
      if (isProtected(part) || lstatSync(absolute).isSymbolicLink()) {
        return { ...entry, status: 'excluded', excludedEntries: 1 };
      }
    }
  } catch (error) {
    return { ...entry, status: error.code === 'ENOENT' ? 'missing' : 'unreadable' };
  }

  function visit(current) {
    try {
      const stat = lstatSync(current);
      if (isProtected(basename(current)) || stat.isSymbolicLink()) {
        entry.excludedEntries += 1;
      } else if (stat.isDirectory()) {
        for (const name of readdirSync(current)) visit(join(current, name));
      } else if (stat.isFile()) {
        entry.files += 1;
        entry.logicalBytes += stat.size;
      } else {
        entry.excludedEntries += 1;
      }
    } catch {
      entry.unreadableEntries += 1;
    }
  }
  visit(absolute);
  if (entry.unreadableEntries) entry.status = 'partial';
  return entry;
}

export function reportWorkspaceFiles(workspaceRoot) {
  const root = resolve(workspaceRoot);
  const stat = lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('仓库根目录必须是实际目录');
  return {
    mode: 'read-only',
    metric: 'logical file bytes; symlinks excluded; hardlinks may be counted more than once',
    note: '只盘点白名单，不读取文件内容。字节数不是可释放空间；源码和依赖不是清理建议。原生源工程、本地 API 数据、签名/env、安装包、tutorial、模拟器目录不参与产物清理评估。',
    entries: Object.entries(ROOTS).flatMap(([category, paths]) =>
      paths.map(path => inspectEntry(root, path, category))),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) {
    console.error('此命令只读，不接受参数或删除选项：node scripts/report-workspace-files.mjs');
    process.exitCode = 1;
  } else {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    console.log(JSON.stringify(reportWorkspaceFiles(root), null, 2));
  }
}
