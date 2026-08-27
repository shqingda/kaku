import { createApp } from './app.ts';
import { createD1AuthStore } from './auth/store.ts';
import type { Env } from './env.ts';
import { cleanupExpiredAuthData } from './maintenance.ts';
import { pollRegisteredPushUsers } from './push/poll.ts';

const app = createApp();
const MAINTENANCE_CRON = '0 3 * * *';

export default {
  fetch: app.fetch.bind(app),

  async scheduled(event: ScheduledEvent, env: Env) {
    if (event.cron === MAINTENANCE_CRON) {
      const result = await cleanupExpiredAuthData(env.DB, Date.now());
      console.log('Kaku maintenance cleanup', result);
      return;
    }

    const result = await pollRegisteredPushUsers({
      authStore: createD1AuthStore(env.DB),
      env,
    });
    console.log('Kaku push poll', result);
  },
};
