import './config/env';
import { app } from './app';
import { env } from './config/env';

export default {
  port: env.PORT,
  fetch: app.fetch,
};
