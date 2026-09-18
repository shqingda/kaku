# 商店文案草稿

更新：2026-09-18。下列文案对应当前功能；正式提交前在商店后台确认名称占用、分类、年龄分级和隐私表单。未上传或提交商店。

## 简体中文

名称：Kaku

副标题：记录收藏，追踪观看进度

简短描述：浏览动画、书籍、音乐与游戏，同步 Bangumi 收藏、评分和观看进度。

完整描述：

Kaku 帮你整理喜欢的作品，记录每一次观看和阅读。

- 发现作品：搜索动画、书籍、音乐、游戏与三次元条目，查看排行和放送日历。
- 了解作品：浏览简介、角色、声优、关联条目、章节和社区讨论。
- 管理收藏：连接 Bangumi 账户，同步收藏状态、评分和观看进度；按类型、状态或名称查找自己的收藏。
- 继续交流：查看通知、阅读评论与讨论，本机回复草稿让你稍后继续编辑。
- 随时回顾：部分已读取内容可从本机缓存恢复；网络异常时提示重试。
- 贴合习惯：支持浅色与深色外观，可自行控制偏好及历史同步。

无需登录即可浏览公开内容。收藏同步、发言和通知等功能需要 Bangumi 账户及网络连接。Kaku 是独立客户端，不是 Bangumi 官方应用。

## English

Name: Kaku

Subtitle: Track your media collection

Short description: Explore titles and sync your Bangumi collection, ratings, and progress.

Full description:

Keep your favorite stories together with Kaku.

- Discover anime, books, music, games, and live-action titles through search, rankings, and a broadcast calendar.
- Explore descriptions, characters, cast, related works, episodes, and community discussions.
- Connect your Bangumi account to sync collection status, ratings, and progress. Search your collection by title and filter by category or status.
- Read notifications and discussions, and return to locally saved reply drafts.
- Revisit some previously loaded content from local storage, with clear retry options when a connection fails.
- Choose light or dark appearance and control preference and history sync.

Public content can be browsed without signing in. Collection sync, posting, and notifications require a Bangumi account and an internet connection. Kaku is an independent client and is not an official Bangumi app.

## 截图与提交清单

使用 `.maestro/store-screenshots-ios.yaml` 采集原始候选图。先确认模拟器仅有可公开展示的数据，截图不得包含账号、私信或真实通知。候选图在本机 Maestro 输出目录，不自动入库或上传。正式尺寸、裁切和文字标注在提交前按商店要求复核。

1. 首页：公开浏览入口与作品内容。
2. 搜索：搜索「葬送的芙莉莲」。
3. 条目：作品介绍与封面。
4. 章节：章节列表。
5. 收藏盒：登录提示或经授权的演示账号收藏状态。
6. 深色模式：条目或设置页。

缺少 App Store Connect API key / App ID、Play 服务账号与应用后台配置；仓库 `eas.json` 尚无 submit profile。凭据与商店应用记录齐备后配置提交，不把 debug 签名 APK 当成商店产物。

2026-09-18 已在 iPhone 18 Pro / iOS 27.0 采集候选图：`~/.maestro/tests/2026-09-18_235227/Store screenshot candidates/takeScreenshot/`。已检查条目截图，布局正常，但包含开发客户端悬浮齿轮及当前账号收藏状态，因此这批只用作构图参考，不能直接上传商店；正式图需无开发控件的 production 构建和演示账号。
