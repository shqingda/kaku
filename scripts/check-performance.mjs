#!/usr/bin/env node
// 比较同设备、同运行模式、固定 Maestro 路径的三轮 React profiler 测量中位数。
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function checkPerformance(report) {
  if (report?.device !== 'iPhone 17 Pro' || report?.os !== 'iOS 26.5' || report?.mode !== 'development' || report?.flow !== '.maestro/kaku-profile-ios.yaml') {
    throw new Error('采集环境与 2026-09-04 基线不一致，需在同一环境重建基线，禁止直接比较。');
  }
  const limits = { subjectMountMs: 116.33, charactersMountMs: 94.83, charactersUpdateMs: 75.37 };
  return Object.entries(limits).map(([metric, limit]) => {
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
    const results = checkPerformance(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.table(results);
    process.exitCode = results.every(result => result.passed) ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
