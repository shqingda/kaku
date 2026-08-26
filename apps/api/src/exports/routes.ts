import type { Context, Hono } from 'hono';
import { z } from 'zod';

import type { AuthDependencies } from '../auth/routes.ts';
import { authenticateContext } from '../auth/route-helpers.ts';
import { isAuthenticationResponse } from '../auth/session-service.ts';
import type { Env } from '../env.ts';
import {
  createExportStore,
  MAX_EXPORT_BYTES,
  type ExportStore,
} from './store.ts';

const createExportSchema = z.object({
  content: z.string().min(1).max(MAX_EXPORT_BYTES),
  format: z.enum(['json', 'csv']),
});

export type ExportsDependencies = {
  createExportId?: () => string;
  createExportStore?: (
    database: D1Database,
    bucket: R2Bucket,
  ) => ExportStore;
};

function jsonExport(record: {
  byteSize: number;
  createdAt: number;
  expiresAt: number;
  format: 'json' | 'csv';
  id: string;
}) {
  return {
    byteSize: record.byteSize,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    format: record.format,
    id: record.id,
  };
}

function getExportStore(
  env: Env,
  dependencies: ExportsDependencies,
): ExportStore | null {
  if (!env.EXPORTS) return null;

  return dependencies.createExportStore
    ? dependencies.createExportStore(env.DB, env.EXPORTS)
    : createExportStore(env.DB, env.EXPORTS);
}

function unavailable(context: Context<{ Bindings: Env }>) {
  return context.json(
    {
      error: 'exports_unavailable',
      message: '云端备份尚未启用。',
    },
    503,
  );
}

export function registerExportRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies & ExportsDependencies = {},
) {
  const now = dependencies.now ?? Date.now;
  const createExportId = dependencies.createExportId ?? crypto.randomUUID.bind(crypto);

  app.get('/me/exports', async (context) => {
    const store = getExportStore(context.env, dependencies);
    if (!store) return unavailable(context);

    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const exports = await store.list(authentication.userId);
    return context.json({ exports: exports.map(jsonExport) });
  });

  app.post('/me/exports', async (context) => {
    const store = getExportStore(context.env, dependencies);
    if (!store) return unavailable(context);

    const body = createExportSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!body.success) {
      return context.json(
        { error: 'invalid_export', message: '备份内容和格式不正确。' },
        400,
      );
    }

    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const byteSize = new TextEncoder().encode(body.data.content).byteLength;
    if (byteSize > MAX_EXPORT_BYTES) {
      return context.json(
        { error: 'export_too_large', message: '备份超过 800KB，请改用本机分享。' },
        413,
      );
    }

    const record = await store.create({
      body: body.data.content,
      format: body.data.format,
      id: createExportId(),
      now: now(),
      userId: authentication.userId,
    });

    return context.json({ export: jsonExport(record) }, 201);
  });

  app.get('/me/exports/:id', async (context) => {
    const store = getExportStore(context.env, dependencies);
    if (!store) return unavailable(context);

    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const stored = await store.get(
      authentication.userId,
      context.req.param('id'),
    );
    if (!stored) {
      return context.json(
        { error: 'export_not_found', message: '没有找到这份云端备份。' },
        404,
      );
    }

    const filename = `kaku-collections.${stored.record.format}`;
    return new Response(stored.body, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type':
          stored.record.format === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'application/json; charset=utf-8',
      },
    });
  });

  app.delete('/me/exports/:id', async (context) => {
    const store = getExportStore(context.env, dependencies);
    if (!store) return unavailable(context);

    const { authentication } = await authenticateContext(
      context,
      dependencies.createStore,
      now,
    );
    if (isAuthenticationResponse(authentication)) return authentication;

    const deleted = await store.delete(
      authentication.userId,
      context.req.param('id'),
    );
    if (!deleted) {
      return context.json(
        { error: 'export_not_found', message: '没有找到这份云端备份。' },
        404,
      );
    }

    return context.json({ deleted: true });
  });
}
