import { createApp } from './app.ts';
import type { Env } from './env.ts';
import { cleanupExpiredAuthData } from './maintenance.ts';

const app = createApp();

export default {
  fetch: app.fetch.bind(app),

  async scheduled(_event: ScheduledEvent, env: Env) {
    const result = await cleanupExpiredAuthData(
      env.DB,
      Date.now(),
      env.EXPORTS,
    );
    console.log('Kaku maintenance cleanup', result);
  },
};
