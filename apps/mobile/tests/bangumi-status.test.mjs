import assert from 'node:assert/strict';
import test from 'node:test';

import { CHANGELOG } from '../src/features/changelog/changelog-data.ts';
import {
  BANGUMI_STATUS_ENDPOINT,
  classifyProbeLatency,
  parseBangumiStatus,
} from '../src/features/network-status/bangumi-status.ts';

// 按真实 /api/status 响应缩减的样例（字段名保持一致）。
const SAMPLE = {
  status: 'ok',
  message: 'All systems operational',
  updated_at: 1787934043,
  online: 14,
  probes: [],
  components: [
    {
      domain: 'bgm.tv',
      kind: 'guest',
      label: 'bgm.tv · Guest',
      status: 'ok',
      uptime: 100,
      last_check: 1787934037,
      days: [
        {
          day: '2026-08-27',
          uptime: 99.5,
          total: 100,
          down: 1,
          degrade: 0,
          status: 'degraded',
        },
        {
          day: '2026-08-28',
          uptime: 100,
          total: 100,
          down: 0,
          degrade: 0,
          status: 'ok',
        },
      ],
      probe_views: [
        {
          probe: 'pc-cn-beijing',
          region: 'cn',
          status: 'down',
          latency_ms: 10007,
          ts: 1,
          err: 'dial tcp: i/o timeout',
        },
        {
          probe: 'pc-uk-london',
          region: 'gb',
          status: 'ok',
          latency_ms: 10,
          http_code: 200,
          ts: 2,
        },
        {
          probe: 'um-hongkong',
          region: 'hk',
          status: 'ok',
          latency_ms: 210,
          ts: 3,
        },
      ],
    },
    {
      domain: 'api.bgm.tv',
      kind: 'auth',
      label: 'api.bgm.tv · Authenticated',
      status: 'down',
      uptime: 98.13,
      days: [],
      probe_views: [],
      incidents: [
        {
          start_ts: 100,
          end_ts: 160,
          status: 'degraded',
          duration_s: 60,
          peak_down: 10,
          peak_total: 14,
        },
        {
          start_ts: 500,
          end_ts: 5000,
          status: 'down',
          duration_s: 4500,
          peak_down: 14,
          peak_total: 14,
        },
      ],
    },
  ],
};

test('status endpoint points at the redirect target of status.bgm.tv', () => {
  assert.equal(BANGUMI_STATUS_ENDPOINT, 'https://bgm-status.ry.mk/api/status');
});

test('parse keeps component days, averages healthy probe latency, and picks the latest incident', () => {
  const report = parseBangumiStatus(SAMPLE);

  assert.ok(report);
  assert.equal(report.level, 'ok');
  assert.equal(report.message, 'All systems operational');
  assert.equal(report.updatedAt, 1787934043);
  assert.equal(report.components.length, 2);

  const [guest, api] = report.components;
  assert.equal(guest.label, 'bgm.tv · Guest');
  assert.equal(guest.level, 'ok');
  assert.equal(guest.uptime30d, 100);
  assert.equal(guest.avgLatencyMs, 110);
  assert.equal(guest.days.length, 2);
  assert.deepEqual(guest.days[0], { day: '2026-08-27', level: 'degraded', uptime: 99.5 });
  assert.equal(guest.latestIncident, null);

  assert.equal(api.level, 'down');
  assert.equal(api.avgLatencyMs, null);
  assert.deepEqual(api.latestIncident, {
    startedAt: 500,
    endedAt: 5000,
    level: 'down',
    durationS: 4500,
  });
});

test('parse tolerates missing optional fields and unknown status strings', () => {
  const report = parseBangumiStatus({
    status: 'weird',
    components: [{ label: 'bgm.tv', days: [{ day: '2026-08-28', status: 'meh' }] }],
  });

  assert.ok(report);
  assert.equal(report.level, 'unknown');
  assert.equal(report.message, '');
  assert.equal(report.updatedAt, null);
  assert.equal(report.components[0].level, 'unknown');
  assert.equal(report.components[0].uptime30d, null);
  assert.equal(report.components[0].avgLatencyMs, null);
  assert.equal(report.components[0].days[0].level, 'unknown');
  assert.equal(report.components[0].days[0].uptime, null);
});

test('parse rejects payloads without usable components', () => {
  assert.equal(parseBangumiStatus(null), null);
  assert.equal(parseBangumiStatus('ok'), null);
  assert.equal(parseBangumiStatus({}), null);
  assert.equal(parseBangumiStatus({ components: [] }), null);
  assert.equal(parseBangumiStatus({ components: [{ uptime: 100 }] }), null);
});

test('probe latency buckets at the 3s line', () => {
  assert.equal(classifyProbeLatency(80), 'ok');
  assert.equal(classifyProbeLatency(2999), 'ok');
  assert.equal(classifyProbeLatency(3000), 'slow');
  assert.equal(classifyProbeLatency(7500), 'slow');
});

test('changelog data stays well-formed and newest first', () => {
  assert.ok(CHANGELOG.length >= 2);

  const versions = CHANGELOG.map((entry) => entry.version);
  assert.equal(new Set(versions).size, versions.length, '版本号不应重复');

  for (const entry of CHANGELOG) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.notes.length > 0);
    for (const note of entry.notes) {
      assert.ok(note.trim().length > 0);
    }
  }

  for (let index = 1; index < CHANGELOG.length; index += 1) {
    const previous = CHANGELOG[index - 1];
    const current = CHANGELOG[index];
    const older =
      previous.date > current.date ||
      (previous.date === current.date &&
        compareVersions(previous.version, current.version) > 0);
    assert.ok(older, `${previous.version} 应排在 ${current.version} 之前`);
  }
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (pa[index] !== pb[index]) return pa[index] - pb[index];
  }
  return 0;
}
