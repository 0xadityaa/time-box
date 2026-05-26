import { Hono } from 'hono';

export const app = new Hono();

app.post('/v1/traces', async (c) => {
  // 1. Instantly return 202 Accepted to free the client (Golden Rule)
  c.status(202);
  
  // 2. Schedule background processing of the OTLP payload
  // In Bun, we can just promise-wrap or async-call without awaiting it to unblock the request.
  // Note: For real background jobs in Bun, you might use event emitters, workers, or just un-awaited promises.
  const payloadPromise = c.req.json().catch(err => {
    console.error('Failed to parse incoming OTLP JSON payload:', err);
    return null;
  });
  
  payloadPromise.then(payload => {
    if (!payload) return;
    // Background Processing logic (To be implemented in Step 2.2)
    console.log('Background processed traces payload:', payload?.resourceSpans?.length || 0, 'resource spans');
  });

  // Return standard OTLP empty response
  return c.json({});
});

export default {
  port: 4318,
  fetch: app.fetch,
};
