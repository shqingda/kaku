// 版本更新日志：发新版时由 scripts/sync-changelog.mjs 在最上面写入。
// 当前版本已存在时不会覆盖，所以仍可手改条目。
// 内容面向用户写「发生了什么变化」，不写重构、CI 等内部工作；
// date 是发布日期（YYYY-MM-DD），与 app.config.js 的 version 对应。
export type ChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.24',
    date: '2026-10-28',
    notes: [
      '更新日志改为只显示当前版本。',
    ],
  },
];
