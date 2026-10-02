#!/usr/bin/env node
// 比较同设备、同运行模式、固定 Maestro 路径的三轮 React profiler 测量中位数。
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const defaultBaseline = JSON.parse(readFileSync(new URL('./baselines/ios-2026-09-04.json', import.meta.url), 'utf8'));

export function checkPerformance(report, baseline = defaultBaseline) {
  for (const key of ['device', 'os', 'mode', 'flow']) {
    if (typeof baseline?.[key] !== 'string' || !baseline[key] || report?.[key] !== baseline[key]) {
      throw new Error('采集环境与基线不一致，需在同一环境重建基线，禁止直接比较。');
    }
  }
  if (!Number.isFinite(baseline.budgetRatio) || baseline.budgetRatio < 1 ||
      !baseline.metrics || typeof baseline.metrics !== 'object' || Array.isArray(baseline.metrics) ||
      Object.keys(baseline.metrics).length === 0) throw new Error('基线需要有效的回退预算和采样指标。');
  return Object.entries(baseline.metrics).map(([metric, measured]) => {
    if (!Number.isFinite(measured) || measured <= 0) throw new Error(`${metric} 基线必须为正数毫秒值。`);
    // 向上保留两位，维持原有 116.33 / 94.83 / 75.37ms 阈值。
    const limit = Math.ceil(measured * baseline.budgetRatio * 100) / 100;
    if (!Number.isFinite(limit)) throw new Error(`${metric} 回退预算超出有效范围。`);
    const samples = report[metric];
    if (!Array.isArray(samples) || samples.length !== 3 || samples.some(value => !Number.isFinite(value) || value <= 0)) {
      throw new Error(`${metric} 需要三轮有效的正数毫秒值。`);
    }
    const median = [...samples].sort((a, b) => a - b)[1];
    return { metric, median, limit, passed: median <= limit };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const baseline = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : defaultBaseline;
    const results = checkPerformance(JSON.parse(readFileSync(process.argv[2], 'utf8')), baseline);
    console.table(results);
    process.exitCode = results.every(result => result.passed) ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
