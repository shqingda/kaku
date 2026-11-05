# Kaku Web

Kaku 的产品官网与公开政策页面。

品牌图标由 `apps/mobile/scripts/generate-app-icons.mjs` 的矢量定义生成（默认的「墨」图标），
官网使用其产物 `apps/mobile/assets/images/kaku-icon.png`。
开发和构建命令会生成官网的 `public/kaku-icon.png`，保留 favicon、分享图和页面的原有 URL；首页图标示例的
`public/app-icons/` 同样由移动端预览图生成。生成副本不提交。页头、页脚和收尾的字标是
`src/components/kaku-mark.tsx` 里的内嵌 SVG，会跟随日夜主题；图标几何改动后要同步这里的路径。

## 设计约定

- 配色取自图标：墨色、白纸和一块玫瑰色三角。全站只有玫瑰色一个强调色，色值在 `src/styles.css` 的 `:root`。
- 间距、字号和圆角使用 `styles.css` 顶部的令牌，不写裸数字。
- 动效：可触碰的元素用 `--spring-*` 弹簧，按下立即反馈；入场和手机展开用滚动驱动动画，
  不支持的浏览器直接显示最终布局；`prefers-reduced-motion` 时全部关闭。
- 产品界面是 HTML 模拟，海报是抽象几何，不使用真实封面或用户数据。

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
