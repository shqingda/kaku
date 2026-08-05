const content = {
  privacy: {
    eyebrow: 'Privacy',
    title: '隐私政策',
    intro: 'Kaku 只处理提供产品功能所必需的数据，并尽可能让授权、存储与退出过程保持清楚。',
    sections: [
      ['我们处理的信息', '当你连接 Bangumi 时，Kaku 会处理 Bangumi 用户 ID、昵称、头像、收藏状态、章节进度和评分。Kaku 不接收或保存你的 Bangumi 密码。'],
      ['授权凭据', 'Bangumi OAuth 授权凭据在服务端加密存储，仅用于代表你向 Bangumi 请求已授权的功能。移动端只保存 Kaku 会话凭据。'],
      ['基础设施', 'Kaku 使用 Cloudflare Workers 与 D1 提供登录交接、会话管理和必要的数据代理。基础设施可能记录用于安全与故障排查的短期请求元数据。'],
      ['你的控制权', '你可以退出当前设备、移除其他设备会话，或断开 Bangumi。断开后，Kaku 会删除保存的 Bangumi 凭据与所有 Kaku 会话。'],
      ['数据出售', 'Kaku 不出售个人数据，也不会将收藏与兴趣数据用于第三方广告画像。'],
    ],
  },
  terms: {
    eyebrow: 'Terms',
    title: '服务条款',
    intro: '使用 Kaku 即表示你理解这是由独立开发者提供、仍在持续完善中的 Bangumi 第三方客户端。',
    sections: [
      ['第三方服务', 'Kaku 依赖 Bangumi 的网站、接口与授权服务。Bangumi 的可用性、内容与账户规则由 Bangumi 管理，Kaku 与 Bangumi 番组计划无隶属或代理关系。'],
      ['合理使用', '你不得利用 Kaku 进行攻击、批量抓取、滥用接口、绕过访问限制或侵犯他人权益的行为。'],
      ['服务变化', '测试期间功能、平台支持与计划价格可能调整。重要变化会在产品或官网中说明。'],
      ['付费功能', 'Kaku 通过 PayPal 提供 2.99 美元的一次性早期支持方案，不会自动续费。Kaku Pro 仍在开发，购买者应保留 PayPal 订单号以便正式开放后领取对应权益；开放前如不希望继续等待，可通过支持页面联系退款。'],
      ['免责声明', '我们会认真维护数据同步的正确性，但网络、Bangumi 或基础设施故障可能导致暂时不可用。Kaku 会明确展示失败，不承诺服务永不中断。'],
    ],
  },
} as const;

export function LegalPage({ type }: { type: keyof typeof content }) {
  const page = content[type];
  return (
    <section className="legal-page section-pad">
      <div className="legal-heading"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p><small>最后更新：2026 年 8 月 5 日</small></div>
      <div className="legal-content">
        {page.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
      </div>
    </section>
  );
}
