// 版本更新日志：发新版时在最上面加一条新版本。
// 内容面向用户写「发生了什么变化」，不写重构、CI 等内部工作；
// date 是发布日期（YYYY-MM-DD），与 app.config.js 的 version 对应。
export type ChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.10',
    date: '2026-08-29',
    notes: [
      '新增「更新日志」：按版本回顾 Kaku 的新功能与修复',
      '新增「网络诊断」：查看 Bangumi 各服务近 30 天的可用率，并测试本机到各域名的连通性',
    ],
  },
  {
    version: '1.0.9',
    date: '2026-08-28',
    notes: [
      '完成 Firebase 推送接入：带 Google Play 服务的 Android 可以稳定收到 Bangumi 通知',
      '安装包改为单一 64 位构建（arm64-v8a），不再提供 32 位与模拟器包',
      '没有 Play 服务的设备仍可在通知页手动拉取未读',
    ],
  },
  {
    version: '1.0.8',
    date: '2026-08-28',
    notes: [
      '新增 Bangumi 推送通知（需要 Google Play 服务）',
      '主屏幕新增快捷方式：长按图标直达动态、时间线等页面',
      '支持远程退出其他登录设备，换机更安心',
      '设置页的云同步按条目显示状态与实时计数',
      '条目页不再叠加 AniList 的补充数据',
    ],
  },
  {
    version: '1.0.7',
    date: '2026-08-23',
    notes: [
      '条目详情按播出日期区分「已播出」与「未观看」的集数',
      '升级基础依赖与构建工具',
    ],
  },
];
