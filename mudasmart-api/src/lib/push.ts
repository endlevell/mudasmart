import { logger } from './logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_LIMIT = 100; // batas per request Expo push API

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Kirim push via Expo push API — fire-and-forget; kegagalan tidak boleh
// menggagalkan request utama (dilog saja).
export async function sendPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  for (let i = 0; i < messages.length; i += EXPO_PUSH_LIMIT) {
    const chunk = messages.slice(i, i + EXPO_PUSH_LIMIT);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) logger.info('push_batch_failed', { status: response.status, count: chunk.length });
    } catch (error) {
      logger.info('push_error', { message: error instanceof Error ? error.message : 'unknown' });
    }
  }
}
