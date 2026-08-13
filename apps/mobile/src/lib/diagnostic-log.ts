import Storage from 'expo-sqlite/kv-store';

import { sanitizeDiagnosticText } from './diagnostic-redaction';

const DIAGNOSTIC_STORAGE_KEY = 'kaku-diagnostic-records';
const MAX_DIAGNOSTIC_RECORDS = 10;

export type DiagnosticRecord = {
  componentStack?: string;
  createdAt: number;
  id: string;
  message: string;
  name: string;
  stack?: string;
};

function isDiagnosticRecord(value: unknown): value is DiagnosticRecord {
  if (!value || typeof value !== 'object') return false;

  const record = value as Partial<DiagnosticRecord>;
  return (
    typeof record.createdAt === 'number' &&
    Number.isFinite(record.createdAt) &&
    typeof record.id === 'string' &&
    typeof record.message === 'string' &&
    typeof record.name === 'string' &&
    (record.stack === undefined || typeof record.stack === 'string') &&
    (record.componentStack === undefined ||
      typeof record.componentStack === 'string')
  );
}

export function parseDiagnosticRecords(value: string | null): DiagnosticRecord[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(isDiagnosticRecord).slice(0, MAX_DIAGNOSTIC_RECORDS)
      : [];
  } catch {
    return [];
  }
}

export async function readDiagnosticRecords() {
  return parseDiagnosticRecords(await Storage.getItem(DIAGNOSTIC_STORAGE_KEY));
}

export async function recordDiagnosticError(
  error: Error,
  componentStack?: string | null,
) {
  const records = await readDiagnosticRecords();
  const createdAt = Date.now();
  const nextRecord: DiagnosticRecord = {
    componentStack: componentStack
      ? sanitizeDiagnosticText(componentStack)
      : undefined,
    createdAt,
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    message: sanitizeDiagnosticText(error.message, 1_000),
    name: sanitizeDiagnosticText(error.name, 120) || 'Error',
    stack: error.stack ? sanitizeDiagnosticText(error.stack) : undefined,
  };

  await Storage.setItem(
    DIAGNOSTIC_STORAGE_KEY,
    JSON.stringify([nextRecord, ...records].slice(0, MAX_DIAGNOSTIC_RECORDS)),
  );
}

export async function clearDiagnosticRecords() {
  await Storage.removeItem(DIAGNOSTIC_STORAGE_KEY);
}
