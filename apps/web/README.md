# Kaku Web

Kaku 的产品官网、定价与公开政策页面。

## 本地开发

```bash
pnpm dev:web
```

生产构建：

```bash
pnpm build:web
```

## 发布

官网通过 Cloudflare Workers Static Assets 部署：

```bash
pnpm --filter @kaku/web run deploy
```

公开地址：<https://kaku-web.shqingda.workers.dev>

产品介绍、价格、隐私政策、服务条款和支持信息均可由首页导航访问。定价页明确标注当前商品为早期支持方案、付费入口暂未开放，Kaku Pro 仍在开发中。
