# 文档

活文档（会随仓库改）和测试快照（按日期冻结，不回改）分开。

## 活文档

| 文件 | 内容 |
| --- | --- |
| [testing.md](./testing.md) | 三层测试怎么跑、CI 跑什么、Maestro 清单 |
| [deploy-api.md](./deploy-api.md) | Cloudflare Worker 手动部署、迁移、回滚 |
| [argent-usage.md](./argent-usage.md) | 本机用 Argent 做模拟器交互验收 |
| [indie-ops-case.md](./indie-ops-case.md) | 独立开发者运营课的事实备忘，不是功能规格 |

发版步骤在仓库根目录 [RELEASE.md](../RELEASE.md)，不在 `docs/`。
协作约定在 [AGENTS.md](../AGENTS.md)。未完成事项在 [TODO.md](../TODO.md)。

## 测试快照

`test-records/` 里每一份都是当时环境的记录，过期信息不回写。
索引见 [test-records/README.md](./test-records/README.md)。

核对文档时以代码为准：`apps/`、`.maestro/`、`.github/workflows/`。
