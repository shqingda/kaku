// status.bgm.tv 是社区维护的 Bangumi 可用性监控（开源项目
// https://github.com/maho0x/bangumi-status）。入口域名会整站 302 到
// bgm-status.ry.mk，直接请求最终地址省一次跳转。
// 本模块保持与 React Native 无关，便于 node:test 直接单测。
export const BANGUMI_STATUS_ENDPOINT = 'https://bgm-status.ry.mk/api/status';

export type ServiceLevel = 'ok' | 'degraded' | 'down' | 'unknown';

export type StatusDay = {
  day: string;
  level: ServiceLevel;
  uptime: number | null;
};

export type ComponentIncident = {
  startedAt: number;
  endedAt: number | null;
  level: ServiceLevel;
  durationS: number;
};

export type ComponentStatus = {
  domain: string;
  label: string;
  level: ServiceLevel;
  uptime30d: number | null;
  avgLatencyMs: number | null;
  days: StatusDay[];
  latestIncident: ComponentIncident | null;
};

export type StatusReport = {
  level: ServiceLevel;
  message: string;
  updatedAt: number | null;
  components: ComponentStatus[];
};

function toLevel(value: unknown): ServiceLevel {
  return value === 'ok' || value === 'degraded' || value === 'down'
    ? value
    : 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function averageProbeLatency(value: unknown): number | null {
  if (!Array.isArray(value)) return null;
  const latencies = value
    .filter(isRecord)
    .filter((probe) => probe.status !== 'down')
    .map((probe) => probe.latency_ms)
    .filter((latency): latency is number => typeof latency === 'number');
  if (latencies.length === 0) return null;
  return Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length);
}

function pickLatestIncident(value: unknown): ComponentIncident | null {
  if (!Array.isArray(value)) return null;
  let latest: Record<string, unknown> | null = null;
  for (const incident of value) {
    if (!isRecord(incident) || typeof incident.start_ts !== 'number') continue;
    if (!latest || incident.start_ts > (latest.start_ts as number)) {
      latest = incident;
    }
  }
  if (!latest) return null;
  return {
    startedAt: latest.start_ts as number,
    endedAt: typeof latest.end_ts === 'number' ? latest.end_ts : null,
    level: toLevel(latest.status),
    durationS: typeof latest.duration_s === 'number' ? latest.duration_s : 0,
  };
}

function parseComponent(value: unknown): ComponentStatus | null {
  if (!isRecord(value)) return null;
  const label = typeof value.label === 'string' ? value.label : '';
  const domain = typeof value.domain === 'string' ? value.domain : '';
  if (!label && !domain) return null;

  const days = Array.isArray(value.days)
    ? value.days.filter(isRecord).map((day) => ({
        day: typeof day.day === 'string' ? day.day : '',
        level: toLevel(day.status),
        uptime: typeof day.uptime === 'number' ? day.uptime : null,
      }))
    : [];

  return {
    domain,
    label: label || domain,
    level: toLevel(value.status),
    uptime30d: typeof value.uptime === 'number' ? value.uptime : null,
    avgLatencyMs: averageProbeLatency(value.probe_views),
    days,
    latestIncident: pickLatestIncident(value.incidents),
  };
}

// 只做宽松校验与字段归一：状态服务是第三方项目，字段缺失不应让页面崩溃。
export function parseBangumiStatus(payload: unknown): StatusReport | null {
  if (!isRecord(payload) || !Array.isArray(payload.components)) return null;
  const components = payload.components
    .map(parseComponent)
    .filter((component): component is ComponentStatus => component !== null);
  if (components.length === 0) return null;
  return {
    level: toLevel(payload.status),
    message: typeof payload.message === 'string' ? payload.message : '',
    updatedAt: typeof payload.updated_at === 'number' ? payload.updated_at : null,
    components,
  };
}

export async function fetchBangumiStatus(
  signal?: AbortSignal,
): Promise<StatusReport> {
  const response = await fetch(BANGUMI_STATUS_ENDPOINT, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`状态服务返回 ${response.status}`);
  }
  const report = parseBangumiStatus(await response.json());
  if (!report) {
    throw new Error('状态服务返回了无法解析的数据');
  }
  return report;
}

// ---- 本机连通性探测 ----

export type ConnectivityTarget = {
  id: string;
  name: string;
  host: string;
  url: string;
};

// Kaku 实际依赖的 Bangumi 域名：v0 API、主站（OAuth 跳转）、新版 API 与镜像域。
export const CONNECTIVITY_TARGETS: ConnectivityTarget[] = [
  { id: 'api', name: 'API 服务', host: 'api.bgm.tv', url: 'https://api.bgm.tv/' },
  { id: 'main', name: '主站', host: 'bgm.tv', url: 'https://bgm.tv/' },
  { id: 'mirror', name: '镜像域名', host: 'bangumi.tv', url: 'https://bangumi.tv/' },
  { id: 'next', name: '新版 API', host: 'next.bgm.tv', url: 'https://next.bgm.tv/' },
];

export type ProbeState = 'ok' | 'slow' | 'failed';

export type ProbeResult = {
  state: ProbeState;
  latencyMs: number | null;
  detail: string | null;
};

// 3 秒以上视为偏慢；是否连通只看「有没有收到响应」，401/403 等状态码
// 同样说明 DNS、TLS 与网络都是通的。
export function classifyProbeLatency(latencyMs: number): ProbeState {
  return latencyMs >= 3000 ? 'slow' : 'ok';
}

export async function probeConnectivity(
  url: string,
  timeoutMs = 8000,
): Promise<ProbeResult> {
  // Hermes 尚未实现 AbortSignal.timeout，用 AbortController + 定时器替代。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    const latencyMs = Date.now() - startedAt;
    try {
      // 连通性只关心响应头，主动取消正文下载，避免为主站整页浪费流量。
      void response.body?.cancel().catch(() => undefined);
    } catch {
      // 部分原生栈没有可取消的 body 流，忽略即可。
    }
    return { state: classifyProbeLatency(latencyMs), latencyMs, detail: null };
  } catch (error) {
    return {
      state: 'failed',
      latencyMs: null,
      detail: controller.signal.aborted
        ? '连接超时'
        : error instanceof Error
          ? error.message
          : '网络错误',
    };
  } finally {
    clearTimeout(timer);
  }
}
