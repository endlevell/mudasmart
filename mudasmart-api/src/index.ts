import './config/env';
import { app } from './app';
import { env } from './config/env';
import { startReminderScheduler } from './lib/reminders';

export default {
  port: env.PORT,
  fetch: app.fetch,
};

startReminderScheduler();
