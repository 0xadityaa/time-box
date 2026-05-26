import { Hono } from 'hono';
import { traceQueue } from './queue';

export const app = new Hono();

traceQueue.start();

// Auth Middleware
app.use('/v1/traces', async (c, next) => {
  const expectedApiKey = process.env.TIMEBOX_API_KEY;
  // If TIMEBOX_API_KEY is not set on the server, we allow all for local dev ease,
  // but in prod it should be set.
  if (expectedApiKey) {
    const providedKey = c.req.header('x-api-key') || c.req.header('Authorization')?.replace('Bearer ', '');
    if (!providedKey || providedKey !== expectedApiKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }
  await next();
});

app.post('/v1/traces', async (c) => {
  try {
    // 1. Consume the payload stream before the connection closes
    const payload = await c.req.json();
    
    // 2. Schedule background processing by pushing to the in-memory queue
    if (payload) {
      traceQueue.enqueue(payload);
    }
  } catch (err) {
    console.error('Failed to parse incoming OTLP JSON payload:', err);
  }

  // 3. Instantly return 202 Accepted to free the client (Golden Rule)
  c.status(202);
  return c.body(null);
});

export default {
  port: process.env.PORT || 4318,
  fetch: app.fetch,
};
