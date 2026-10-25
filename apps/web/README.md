# Kaku Web

Kaku 的产品官网与公开政策页面。

品牌图标的唯一源文件是 `apps/mobile/assets/images/kaku-icon.png`。
开发和构建命令会生成官网的 `public/kaku-icon.png`，保留 favicon、分享图和页面的原有 URL；生成副本不提交。

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

产品介绍、免费使用说明、隐私政策、服务条款和支持信息均可由首页导航访问。Kaku 当前不提供购买或订阅入口。
