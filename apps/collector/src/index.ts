import { Hono } from 'hono';

import { processOtlpPayload } from './processor';

export const app = new Hono();

app.post('/v1/traces', async (c) => {
  // 1. Instantly return 202 Accepted to free the client (Golden Rule)
  c.status(202);
  
  // 2. Schedule background processing of the OTLP payload
  const payloadPromise = c.req.json().catch(err => {
    console.error('Failed to parse incoming OTLP JSON payload:', err);
    return null;
  });
  
  payloadPromise.then(payload => {
    if (!payload) return;
    
    // Check if user opted-in to saving raw payload context
    const captureContent = process.env.OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT === 'true';
    
    processOtlpPayload(payload, captureContent).catch(err => {
      console.error('Failed to process OTLP payload:', err);
    });
  });

  // Return standard OTLP empty response
  return c.json({});
});

export default {
  port: 4318,
  fetch: app.fetch,
};
