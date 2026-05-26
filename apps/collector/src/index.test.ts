import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import { app } from './index';
import { traceQueue } from './queue';

describe('Collector OTLP Endpoint', () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.TIMEBOX_API_KEY;
  });

  afterAll(() => {
    if (originalKey) process.env.TIMEBOX_API_KEY = originalKey;
    else delete process.env.TIMEBOX_API_KEY;
    traceQueue.stop();
  });

  test('POST /v1/traces returns 202 Accepted immediately without auth if no key set', async () => {
    delete process.env.TIMEBOX_API_KEY;
    const req = new Request('http://localhost/v1/traces', {
      method: 'POST',
      body: JSON.stringify({ resourceSpans: [] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await app.request(req);
    expect(res.status).toBe(202);
  });

  test('POST /v1/traces returns 401 Unauthorized if API key is required but missing', async () => {
    process.env.TIMEBOX_API_KEY = 'secret123';
    const req = new Request('http://localhost/v1/traces', {
      method: 'POST',
      body: JSON.stringify({ resourceSpans: [] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await app.request(req);
    expect(res.status).toBe(401);
  });

  test('POST /v1/traces returns 202 Accepted if API key matches', async () => {
    process.env.TIMEBOX_API_KEY = 'secret123';
    const req = new Request('http://localhost/v1/traces', {
      method: 'POST',
      body: JSON.stringify({ resourceSpans: [] }),
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'secret123'
      },
    });

    const res = await app.request(req);
    expect(res.status).toBe(202);
  });
});
