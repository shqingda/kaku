const content = {
  privacy: {
    eyebrow: 'Privacy',
    title: '隐私政策',
    intro: 'Kaku 只处理提供产品功能所必需的数据。下面的说明试图准确描述数据如何流动、存储在哪里，以及你如何撤回访问。',
    sections: [
      ['我们处理的信息', '连接 Bangumi 后，Kaku 会代表你访问并展示 Bangumi 用户 ID、昵称、头像、收藏状态、章节进度、评分与好友动态。Kaku 从不接收或保存你的 Bangumi 密码。'],
      ['授权与凭据', '登录通过系统浏览器在 Bangumi 官方页面完成。Bangumi OAuth 授权凭据加密保存在 Kaku 的服务器（Cloudflare D1 数据库）中，仅用于代表你向 Bangumi 请求已授权的功能。移动端只保存 Kaku 自己的会话凭据。'],
      ['数据如何流动', '评论、收藏、动态、通知等内容只在你使用 App 时实时转发给 Bangumi 或从 Bangumi 读取，不会写入 Kaku 的数据库，也不会被分析、标记或建立兴趣画像。界面错误记录只保存在你的设备本地，不会自动上传。'],
      ['会话与设备', 'Kaku 会记录当前登录设备，以便你在账户页查看并撤销其他设备会话。撤销会话或断开 Bangumi 后，Kaku 会删除对应的授权凭据与所有会话。'],
      ['基础设施与缓存', 'Kaku 使用 Cloudflare Workers、D1 与边缘缓存提供登录交接、会话管理和公开数据代理。Cloudflare 可能记录用于安全与故障排查的短期请求元数据（如 IP、设备信息与时间），不包含内容正文。边缘缓存只包含条目、榜单等公开数据，不含个人信息。'],
      ['你的控制权', '你可以在 App 内断开 Bangumi（删除全部凭据与会话）、退出当前设备或撤销其他设备会话、清除本地界面错误记录。我们不出售个人数据，也不将收藏与兴趣用于第三方广告画像。'],
      ['联系开发者', '关于本政策或数据处理的问题，可以通过 GitHub Issues 或支持页联系开发者。'],
    ],
  },
  terms: {
    eyebrow: 'Terms',
    title: '服务条款',
    intro: '使用 Kaku 即表示你理解这是由独立开发者提供、仍在持续完善中的 Bangumi 第三方客户端。',
    sections: [
      ['第三方服务', 'Kaku 依赖 Bangumi 的网站、接口与授权服务。Bangumi 的可用性、内容与账户规则由 Bangumi 管理，Kaku 与 Bangumi 番组计划无隶属或代理关系。'],
      ['合理使用', '你不得利用 Kaku 进行攻击、批量抓取、滥用接口、绕过访问限制或侵犯他人权益的行为。'],
      ['服务变化', '测试期间功能与平台支持可能调整。重要变化会在产品或官网中说明。'],
      ['免费使用', 'Kaku 当前不收取费用，官网与 App 均不提供购买或订阅入口。'],
      ['免责声明', '我们会认真维护数据同步的正确性，但网络、Bangumi 或基础设施故障可能导致暂时不可用。Kaku 会明确展示失败，不承诺服务永不中断。'],
    ],
  },
} as const;

export function LegalPage({ type }: { type: keyof typeof content }) {
  const page = content[type];
  return (
    <section className="legal-page section-pad">
      <div className="legal-heading"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p><small>最后更新：2026 年 8 月 18 日</small></div>
      <div className="legal-content">
        {page.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
      </div>
    </section>
  );
}
