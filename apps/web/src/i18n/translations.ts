export type Language = 'zh' | 'en';

type FaqItem = { q: string; a: string };
type LegalSection = { title: string; body: string };
type LegalDoc = { title: string; intro: string; updated: string; sections: LegalSection[] };

type Translation = {
  langLabel: string;
  skipLink: string;
  header: {
    github: string;
    switchTheme: string;
    switchLanguage: string;
    themeNames: Record<'light' | 'dark' | 'system', string>;
  };
  home: {
    pill: string;
    heroTitle1: string;
    heroTitle2: string;
    heroSub: string;
    heroPrimary: string;
    heroSecondary: string;
    platformNote: string;
    features: {
      eyebrow: string;
      title1: string;
      title2: string;
      sub: string;
      items: { title: string; copy: string }[];
    };
    sync: {
      eyebrow: string;
      title1: string;
      title2: string;
      copy: string;
      privacyLink: string;
    };
    closing: {
      eyebrow: string;
      title: string;
      copy: string;
      cta: string;
    };
    faq: { eyebrow: string; title: string; items: FaqItem[] };
  };
  footer: {
    tagline: string;
    privacy: string;
    terms: string;
    feedback: string;
    github: string;
    note: string;
  };
  legal: {
    privacy: LegalDoc;
    terms: LegalDoc;
  };
  notFound: {
    title: string;
    copy: string;
    back: string;
    feedback: string;
  };
  meta: {
    home: { title: string; description: string };
    privacy: { title: string; description: string };
    terms: { title: string; description: string };
    notFound: { title: string; description: string };
  };
};

const zh: Translation = {
  langLabel: '中文',
  skipLink: '跳到主要内容',
  header: {
    github: 'GitHub 仓库',
    switchTheme: '切换主题',
    switchLanguage: '切换语言',
    themeNames: { light: '日间模式', dark: '夜间模式', system: '跟随系统' },
  },
  home: {
    pill: 'iOS 与 Android 测试中',
    heroTitle1: '把每一部喜欢，',
    heroTitle2: '留在一个安静的地方。',
    heroSub:
      'Kaku 是一个为移动端重新设计的 Bangumi 第三方客户端。收藏、追踪、评分与讨论，都更轻、更快，也更像原生 App。',
    heroPrimary: '了解 Kaku',
    heroSecondary: '在 GitHub 上关注',
    platformNote: 'iPhone · Android · 免费测试中',
    features: {
      eyebrow: '熟悉，但更顺手',
      title1: '少一点操作，',
      title2: '多一点作品本身。',
      sub: '功能尊重 Bangumi 原版，交互则从移动端重新思考。没有为了“粘性”制造的负担。',
      items: [
        {
          title: '收藏，进度与评分',
          copy: '想看、在看、看过、搁置与抛弃完整对应 Bangumi。每次更新都同步到你的真实账户。',
        },
        {
          title: '章节不再是表格',
          copy: '格子与列表两种视图，长篇作品自动分段。点进每一集，都能继续读讨论。',
        },
        {
          title: '讨论仍然属于社区',
          copy: '吐槽箱、评论、讨论版与回复关系保持原意，用更适合手机的方式呈现。',
        },
      ],
    },
    sync: {
      eyebrow: '一个账户，多台设备',
      title1: '换一块屏幕，',
      title2: '不用重新开始。',
      copy: '使用 Bangumi 官方授权登录。密码不会经过 Kaku；收藏、进度与评分直接同步到你的 Bangumi 账户。',
      privacyLink: '了解隐私设计',
    },
    closing: {
      eyebrow: '正在认真做出来',
      title: '下一集，继续。',
      copy: 'Kaku 正在 iOS 与 Android 上测试，当前全部功能免费开放。',
      cta: '常见问题',
    },
    faq: {
      eyebrow: '常见问题',
      title: '开始之前，可能想知道。',
      items: [
        { q: 'Kaku 现在收费吗？', a: '不收费。官网与 App 当前均不提供购买、订阅或赞助入口。' },
        {
          q: '免费使用会限制收藏数量吗？',
          a: '不会。浏览、收藏、进度、评分与社区阅读不按条目数量限制。',
        },
        {
          q: '如何参与测试或反馈问题？',
          a: '通过页面底部的反馈入口或 GitHub Issues 提交，并附上设备型号、系统版本与复现步骤。',
        },
        { q: 'Kaku 是 Bangumi 官方产品吗？', a: 'Kaku 是独立开发的第三方客户端，与 Bangumi 番组计划没有隶属关系。' },
      ],
    },
  },
  footer: {
    tagline: '为喜欢的作品，留一个安静的位置。',
    privacy: '隐私政策',
    terms: '服务条款',
    feedback: '问题反馈',
    github: 'GitHub 仓库',
    note: '© 2026 Kaku · 独立开发产品。Kaku 与 Bangumi 番组计划无隶属关系。',
  },
  legal: {
    privacy: {
      title: '隐私政策',
      intro:
        '本政策说明 Kaku（以下简称“我们”）如何收集、使用、存储与保护你在使用 Kaku 客户端与服务（以下合称“服务”）过程中涉及的信息。',
      updated: '生效日期：2026 年 8 月 18 日',
      sections: [
        {
          title: '一、适用范围',
          body: '本政策适用于 Kaku 的 iOS、Android 客户端与相关网络服务。使用本服务即表示你已阅读并理解本政策；如果你不同意，请停止使用本服务。',
        },
        {
          title: '二、我们收集与处理的信息',
          body: '（一）授权访问的信息：连接 Bangumi 账户后，为提供核心功能，我们会代表你访问 Bangumi 的公开个人资料（用户 ID、昵称、头像）、收藏状态、观看进度、评分与好友动态。（二）你主动提供的信息：你在反馈问题或联系我们时提交的设备型号、系统版本、复现步骤等描述性内容。（三）自动收集的信息：服务器可能记录用于安全与故障排查的短期请求元数据（如 IP 地址、设备类型与请求时间），不包含内容正文；客户端界面错误日志仅保存在设备本地，不会自动上传。我们不会收集你的 Bangumi 密码，也不会要求你提供。',
        },
        {
          title: '三、信息的使用',
          body: '我们仅将上述信息用于提供、维护与改进服务，包括：登录交接与会话管理、代表你向 Bangumi 请求已授权的数据、公开数据的缓存与加速、安全与故障排查。我们不会分析你的观看历史，不会基于观看与收藏行为建立个人画像，不会将数据用于任何形式的广告。',
        },
        {
          title: '四、存储与安全',
          body: 'Bangumi OAuth 授权凭据以加密形式存储于 Cloudflare D1 数据库；评论、收藏、动态、通知等内容仅在请求时实时转发，不写入我们的数据库。所有通信均经 HTTPS 加密传输。我们采取行业通行的安全措施保护数据，但任何网络传输与存储方式都无法保证绝对安全。',
        },
        {
          title: '五、共享与第三方',
          body: '（一）Bangumi：数据来源与授权方，我们仅按你的授权与其交互。（二）Cloudflare：我们使用 Cloudflare Workers、D1 与边缘缓存作为基础设施，其可能依据其服务条款处理用于安全与故障排查的短期请求元数据。（三）法律要求：仅在法律、法规或监管要求时披露。除上述情形外，我们不会共享你的个人信息，且在任何情况下都不会出售个人数据。',
        },
        {
          title: '六、你的权利与选择',
          body: '你可以随时在 App 内：断开 Bangumi（删除全部授权凭据与会话）、退出当前设备或撤销其他设备会话、清除本地界面错误记录。断开后，我们会在服务器删除对应的授权凭据与所有会话。你也可以拒绝向 Bangumi 授权，此时服务将不可用，但不影响你的 Bangumi 账户本身。',
        },
        {
          title: '七、未成年人',
          body: '本服务面向 13 周岁以上的用户。我们不以 13 周岁以下儿童为目标用户，也无意收集其个人信息；若发现误收集，我们将立即删除。',
        },
        {
          title: '八、政策的变更',
          body: '我们可能不时更新本政策。重大变更（如处理目的、共享范围）会在官网或客户端内显著说明，并在本页更新生效日期。继续使用服务即视为接受更新后的政策。',
        },
        {
          title: '九、联系我们',
          body: '关于本政策或数据处理的任何问题，可通过 GitHub Issues 或官网支持入口联系开发者，我们会在合理时间内回复。',
        },
      ],
    },
    terms: {
      title: '服务条款',
      intro:
        '欢迎使用 Kaku。本条款（以下简称“条款”）约束你对 Kaku 客户端与服务（以下合称“服务”）的使用。使用本服务即表示你同意本条款。',
      updated: '生效日期：2026 年 8 月 18 日',
      sections: [
        {
          title: '一、服务说明',
          body: 'Kaku 是由独立开发者提供的 Bangumi 第三方客户端，旨在以更适合移动端的方式呈现收藏、进度、评分与社区讨论。服务当前处于开发测试阶段，功能与平台支持可能随时间调整。',
        },
        {
          title: '二、账户与授权',
          body: '使用完整功能需要你授权连接 Bangumi 账户。授权通过 Bangumi 官方页面完成；你的 Bangumi 账户仍受其服务条款与社区规则约束。你应对自己账户下的行为负责。',
        },
        {
          title: '三、可接受使用',
          body: '你不得利用本服务进行以下行为：攻击、逆向或干扰服务运行；批量抓取或滥用接口；绕过访问限制或认证机制；发布违法、侵权或骚扰性内容；侵犯他人隐私或知识产权；以其他方式妨碍其他用户正常使用服务。',
        },
        {
          title: '四、知识产权',
          body: 'Kaku 客户端与官网的代码、设计、文案等原创内容归开发者所有，其开源部分依对应开源许可授权使用。通过服务访问的 Bangumi 内容归其原始权利人所有。',
        },
        {
          title: '五、第三方依赖',
          body: '服务依赖 Bangumi 的网站、接口与授权服务，以及 Cloudflare 等基础设施服务。相关服务的可用性、内容与账户规则由对应方管理；Kaku 与 Bangumi 番组计划及上述服务商无隶属或代理关系。',
        },
        {
          title: '六、免责声明与责任限制',
          body: '我们认真维护数据同步的正确性，但网络、第三方服务或基础设施故障可能导致服务暂时不可用，客户端会明确展示失败并提供重试。在法律允许的最大范围内，服务按“现状”提供，我们不承担因服务中断、数据差异或第三方行为造成的间接损失。',
        },
        {
          title: '七、条款的变更',
          body: '我们可能不时更新本条款，重大变更会在官网或客户端内显著说明。继续使用服务即视为接受更新后的条款。',
        },
        {
          title: '八、终止',
          body: '你可以随时停止使用并卸载服务。若你违反本条款，我们可能暂停或终止向违规账号提供服务，并删除相应会话与凭据。',
        },
        {
          title: '九、联系',
          body: '关于本条款的任何问题，可通过 GitHub Issues 或官网支持入口联系开发者。',
        },
      ],
    },
  },
  notFound: {
    title: '这里暂时没有内容。',
    copy: '这个地址可能已经变化，也可能还没有开放。你可以返回首页，或通过 GitHub Issues 反馈问题。',
    back: '返回首页',
    feedback: '问题反馈',
  },
  meta: {
    home: {
      title: 'Kaku · 你的动画与兴趣收藏盒',
      description: 'Kaku 是一款为 iOS 与 Android 设计的 Bangumi 第三方客户端，轻松管理收藏、进度、评分与讨论。',
    },
    privacy: {
      title: '隐私政策 · Kaku',
      description: '了解 Kaku 如何收集、使用、存储与保护你的信息。',
    },
    terms: {
      title: '服务条款 · Kaku',
      description: '查看 Kaku 的服务条款、可接受使用与责任限制。',
    },
    notFound: {
      title: '页面未找到 · Kaku',
      description: '这个 Kaku 页面不存在，返回首页继续浏览。',
    },
  },
};

const en: Translation = {
  langLabel: 'EN',
  skipLink: 'Skip to main content',
  header: {
    github: 'GitHub repository',
    switchTheme: 'Switch theme',
    switchLanguage: 'Switch language',
    themeNames: { light: 'Light mode', dark: 'Dark mode', system: 'System mode' },
  },
  home: {
    pill: 'Testing on iOS & Android',
    heroTitle1: 'Keep every favorite,',
    heroTitle2: 'in a quiet place of its own.',
    heroSub:
      'Kaku is a Bangumi third-party client redesigned for mobile. Collections, tracking, ratings and discussions — lighter, faster, more native.',
    heroPrimary: 'Learn more',
    heroSecondary: 'Follow on GitHub',
    platformNote: 'iPhone · Android · Free in testing',
    features: {
      eyebrow: 'Familiar, yet smoother',
      title1: 'Less to operate,',
      title2: 'more of the work itself.',
      sub: 'Features respect the original Bangumi while the interactions are rethought for mobile. No artificial hooks for “engagement”.',
      items: [
        {
          title: 'Collections, progress & ratings',
          copy: 'Plan-to-watch, watching, watched, on-hold and dropped map one-to-one to your real Bangumi account.',
        },
        {
          title: 'Episodes, not spreadsheets',
          copy: 'Grid and list views, with long series auto-segmented. Open any episode to keep reading its discussion.',
        },
        {
          title: 'Community, as it should be',
          copy: 'Comments, reviews, boards and replies keep their original meaning, presented the way a phone should.',
        },
      ],
    },
    sync: {
      eyebrow: 'One account, many devices',
      title1: 'Switch screens,',
      title2: 'never start over.',
      copy: 'Sign in with the official Bangumi authorization. Your password never passes through Kaku; collections, progress and ratings sync straight to your Bangumi account.',
      privacyLink: 'Learn about privacy',
    },
    closing: {
      eyebrow: 'Being built with care',
      title: 'Next episode, continue.',
      copy: 'Kaku is in testing on iOS and Android, with all features free.',
      cta: 'FAQ',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Before you start, you may want to know.',
      items: [
        { q: 'Does Kaku cost anything?', a: 'No. The website and the app currently offer no purchase, subscription or donation entry points.' },
        { q: 'Does the free plan limit collection size?', a: 'No. Browsing, collections, progress, ratings and community reading are not limited by item count.' },
        { q: 'How do I join testing or report issues?', a: 'Use the feedback link at the bottom of this page or GitHub Issues, with device model, OS version and reproduction steps.' },
        { q: 'Is Kaku an official Bangumi product?', a: 'No. Kaku is an independently developed third-party client, unaffiliated with Bangumi.' },
      ],
    },
  },
  footer: {
    tagline: 'A quiet place for the works you love.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    feedback: 'Report an issue',
    github: 'GitHub',
    note: '© 2026 Kaku · An independent project. Kaku is not affiliated with Bangumi.',
  },
  legal: {
    privacy: {
      title: 'Privacy Policy',
      intro:
        'This policy explains how Kaku (“we”) collects, uses, stores and protects information involved when you use the Kaku clients and services (collectively, the “Service”).',
      updated: 'Effective date: August 18, 2026',
      sections: [
        {
          title: '1. Scope',
          body: 'This policy applies to the Kaku iOS and Android clients and related web services. By using the Service you acknowledge that you have read and understood this policy; if you disagree, please stop using the Service.',
        },
        {
          title: '2. Information we collect and process',
          body: '(a) Information accessed via authorization: after you connect your Bangumi account, to provide core features we access your Bangumi public profile (user ID, nickname, avatar), collection status, viewing progress, ratings and friends’ activity on your behalf. (b) Information you provide: descriptive content such as device model, OS version and reproduction steps submitted when you report issues or contact us. (c) Automatically collected information: servers may record short-lived request metadata for security and troubleshooting (such as IP address, device type and request time), never including content bodies; client-side error logs are stored only on your device and are never uploaded automatically. We never collect or ask for your Bangumi password.',
        },
        {
          title: '3. How we use information',
          body: 'We use the above information solely to provide, maintain and improve the Service, including: sign-in handoff and session management, requesting authorized Bangumi data on your behalf, caching and accelerating public data, and security and troubleshooting. We do not analyze your viewing history, build personal profiles based on viewing or collection behavior, or use data for advertising of any kind.',
        },
        {
          title: '4. Storage and security',
          body: 'Bangumi OAuth credentials are stored encrypted in Cloudflare D1. Comments, collections, activity and notifications are relayed in real time and are never written to our database. All communication is encrypted via HTTPS. We apply industry-standard security measures, but no network transmission or storage method can guarantee absolute security.',
        },
        {
          title: '5. Sharing and third parties',
          body: '(a) Bangumi: the data source and authorization party, with which we interact only per your authorization. (b) Cloudflare: we use Cloudflare Workers, D1 and the edge cache as infrastructure; it may process short-lived request metadata for security and troubleshooting per its own terms. (c) Legal requirements: disclosure only when required by law or regulation. Apart from the above, we never share your personal information, and in no case do we sell personal data.',
        },
        {
          title: '6. Your rights and choices',
          body: 'Within the app you may at any time: disconnect Bangumi (deleting all stored credentials and sessions), sign out of the current device or revoke other device sessions, and clear local error records. After disconnecting, we delete the corresponding credentials and all sessions on our servers. You may also decline to authorize Bangumi; the Service will be unavailable, but your Bangumi account itself is unaffected.',
        },
        {
          title: '7. Minors',
          body: 'The Service is intended for users aged 13 and above. We do not target children under 13 and do not intend to collect their personal information; should we discover such information, we will delete it promptly.',
        },
        {
          title: '8. Changes to this policy',
          body: 'We may update this policy from time to time. Material changes (such as purposes or sharing scope) will be announced prominently on the website or in the client, and the effective date on this page will be updated. Continued use of the Service constitutes acceptance of the updated policy.',
        },
        {
          title: '9. Contact',
          body: 'For any question about this policy or data processing, contact the developer via GitHub Issues or the support link on this website; we will respond within a reasonable time.',
        },
      ],
    },
    terms: {
      title: 'Terms of Service',
      intro:
        'Welcome to Kaku. These terms (the “Terms”) govern your use of the Kaku clients and services (collectively, the “Service”). By using the Service you agree to these Terms.',
      updated: 'Effective date: August 18, 2026',
      sections: [
        {
          title: '1. Service description',
          body: 'Kaku is a Bangumi third-party client provided by an independent developer, designed to present collections, progress, ratings and community discussion in a mobile-first way. The Service is currently in development and testing; features and platform support may change over time.',
        },
        {
          title: '2. Accounts and authorization',
          body: 'Full functionality requires connecting your Bangumi account through authorization. Authorization is completed on the official Bangumi pages; your Bangumi account remains subject to its own terms and community rules. You are responsible for activity under your own account.',
        },
        {
          title: '3. Acceptable use',
          body: 'You must not use the Service to: attack, reverse-engineer or interfere with it; scrape or abuse APIs at scale; bypass access limits or authentication; publish unlawful, infringing or harassing content; violate others’ privacy or intellectual property; or otherwise hinder other users’ normal use of the Service.',
        },
        {
          title: '4. Intellectual property',
          body: 'The code, design and copy of the Kaku client and website are owned by the developer; open-source portions are licensed under their respective open-source licenses. Bangumi content accessed through the Service belongs to its original rights holders.',
        },
        {
          title: '5. Third-party dependencies',
          body: 'The Service depends on Bangumi’s website, APIs and authorization services, as well as infrastructure services such as Cloudflare. The availability, content and account rules of those services are managed by their providers; Kaku is not affiliated with or an agent of Bangumi or those providers.',
        },
        {
          title: '6. Disclaimers and limitation of liability',
          body: 'We work carefully to keep data sync correct, but network, third-party or infrastructure failures may make the Service temporarily unavailable; the client will surface failures clearly and offer retry. To the maximum extent permitted by law, the Service is provided “as is”, and we are not liable for indirect losses caused by outages, data discrepancies or third-party conduct.',
        },
        {
          title: '7. Changes to the Terms',
          body: 'We may update these Terms from time to time; material changes will be announced prominently on the website or in the client. Continued use of the Service constitutes acceptance of the updated Terms.',
        },
        {
          title: '8. Termination',
          body: 'You may stop using and uninstall the Service at any time. If you violate these Terms, we may suspend or terminate service to the offending account and delete the corresponding sessions and credentials.',
        },
        {
          title: '9. Contact',
          body: 'For any question about these Terms, contact the developer via GitHub Issues or the support link on this website.',
        },
      ],
    },
  },
  notFound: {
    title: 'Nothing here yet.',
    copy: 'This address may have changed, or may not be open yet. You can return home, or report the issue via GitHub.',
    back: 'Back to home',
    feedback: 'Report an issue',
  },
  meta: {
    home: {
      title: 'Kaku · Your animation & interest shelf',
      description: 'Kaku is a Bangumi third-party client designed for iOS and Android, making collections, progress, ratings and discussions effortless.',
    },
    privacy: {
      title: 'Privacy Policy · Kaku',
      description: 'How Kaku collects, uses, stores and protects your information.',
    },
    terms: {
      title: 'Terms of Service · Kaku',
      description: 'The terms of service, acceptable use and liability limits for Kaku.',
    },
    notFound: {
      title: 'Page not found · Kaku',
      description: 'This Kaku page does not exist. Head back home to keep browsing.',
    },
  },
};

export const translations: Record<Language, Translation> = { zh, en };
