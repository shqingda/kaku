# 文档导航

从这里找文档。了解产品和本机启动先看 [项目首页](/Users/shqingda/Projects/kaku/README.md)，理解代码先看 [技术架构](/Users/shqingda/Projects/kaku/docs/architecture.md)。

## 按用途查找

| 你想做什么 | 文档 | 内容边界 |
| --- | --- | --- |
| 理解项目怎么组成、数据怎么走 | [技术架构](/Users/shqingda/Projects/kaku/docs/architecture.md) | 分层、登录、收藏、缓存、存储与代码阅读顺序 |
| 跑测试、确认 CI 检查范围 | [测试指南](/Users/shqingda/Projects/kaku/docs/development/testing.md) | 测试命令与验收方式 |
| 操作模拟器、用 Argent 验收 | [Argent 使用手册](/Users/shqingda/Projects/kaku/docs/development/argent-usage.md) | 工具使用与本机注意事项 |
| 构建 Android 包、发布到 GitHub / Play | [发版指南](/Users/shqingda/Projects/kaku/docs/deployment/release.md) | 构建渠道、版本号与发布步骤 |
| 部署或回滚后端 | [API 部署指南](/Users/shqingda/Projects/kaku/docs/deployment/deploy-api.md) | Worker、数据库迁移与环境配置 |
| 开发和部署官网 | [Web 说明](/Users/shqingda/Projects/kaku/apps/web/README.md) | 官网专用命令与访问地址 |
| 写简历、准备面试 | [项目经历与面试详解](/Users/shqingda/Projects/kaku/docs/learning/kaku-project-experience.md) | 开场介绍、名词解释、实现与追问 |
| 学习独立开发者运营 | [运营案例](/Users/shqingda/Projects/kaku/docs/learning/indie-ops-case.md) | 教学材料，不是功能规格 |
| 看下一步做什么 | [当前待办](/Users/shqingda/Projects/kaku/TODO.md) | 仍有效的待办与明确不做的事 |
| 回看阶段改进过程 | [2026-09-11 改进计划](/Users/shqingda/Projects/kaku/docs/plans/2026-09-11-improvement-plan.md) | 当时的计划、决策与执行记录 |
| 查看已记录的验收结果 | [测试记录](/Users/shqingda/Projects/kaku/docs/test-records/README.md) | 带日期的回归与性能基线 |
| 修改 Bangumi 接入层 | [适配层说明](/Users/shqingda/Projects/kaku/apps/mobile/src/infrastructure/bangumi/README.md) | 与源码放在一起的模块约定 |
| 查看协作规则 | [AGENTS](/Users/shqingda/Projects/kaku/AGENTS.md) | 修改、验证、提交与推送约定 |

商店素材：[中英文文案与截图清单](store/listing.md)。

## 目录约定

```text
docs/
├── README.md           文档总入口
├── architecture.md     当前技术架构
├── development/        开发、测试与工具手册
├── deployment/         构建、发布、部署与回滚
├── learning/           面试和运营学习材料
├── plans/              带日期的阶段计划与执行记录
└── test-records/        带日期的测试证据
```

根目录只保留项目首页、当前待办与协作规则。应用或源码目录里的 README 保留就近说明；`scripts/release-notes.md` 是发布脚本使用的发版文案，保留原位。

新增文档放入对应分类，并在上表登记。操作步骤只维护一份，其他文档链接过去；阶段记录保留日期，不能代替当前待办或当前实现。发版结果以 GitHub Releases 为准。
