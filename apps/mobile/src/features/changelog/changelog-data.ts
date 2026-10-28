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
    version: '1.1.25',
    date: '2026-10-29',
    notes: [
      '账户页重新分为「我的」「设置」「关于」，入口更清晰，退出登录始终位于底部。',
      '登录设备改为独立页面，完整展示设备列表，可退出单台或其他设备。',
      '清理缓存时在按钮右侧显示转圈，成功后过渡为对勾，失败可直接重试；保留历史和草稿。',
      '简化历史清理操作，移除设置中的重复历史入口、离线内容、诊断信息及断开 Bangumi 功能。',
      '支持同一账户在同机重新登录时合并重复会话；旧版未记录设备标识的会话仍需手动退出。',
    ],
  },
  {
    version: '1.1.24',
    date: '2026-10-28',
    notes: [
      '更新日志改为只显示当前版本。',
    ],
  },
];
