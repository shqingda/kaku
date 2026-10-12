# Kaku

Kaku 是 iOS / Android 上的第三方 Bangumi 客户端。公开数据不用登录；收藏、进度、评分跟 Bangumi 账户走。

[最新版本](https://github.com/shqingda/kaku/releases/latest) · [文档](docs/README.md) · [待办](TODO.md)

## 开发

```sh
pnpm install
pnpm dev:mobile
```

API：`cp apps/api/.dev.vars.example apps/api/.dev.vars`，再 `pnpm --filter @kaku/api db:migrate:local` 与 `pnpm dev:api`。官网：`pnpm dev:web`。

[技术架构](docs/architecture.md) · [测试](docs/development/testing.md) · [发版](docs/deployment/release.md)

## 文档

- [技术架构](docs/architecture.md)
- [测试指南](docs/development/testing.md)
- [发版指南](docs/deployment/release.md)
- [API 部署](docs/deployment/deploy-api.md)
- [项目经历与面试](docs/learning/kaku-project-experience.md)
- [文档导航](docs/README.md)
