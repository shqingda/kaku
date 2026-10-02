import type { Hono } from 'hono';
import type { AuthDependencies } from '../auth/routes.ts';
import type { Env } from '../env.ts';
import { registerDiscussionReadRoutes } from './read-routes.ts';
import { registerDiscussionCreateRoutes } from './create-routes.ts';
import { registerReplyMutationRoutes } from './reply-mutation-routes.ts';

export function registerDiscussionRoutes(
  app: Hono<{ Bindings: Env }>,
  dependencies: AuthDependencies = {},
) {
  registerDiscussionReadRoutes(app, dependencies);
  registerDiscussionCreateRoutes(app, dependencies);
  registerReplyMutationRoutes(app, dependencies);
}
