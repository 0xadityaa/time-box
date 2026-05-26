import { expect, test, describe } from 'bun:test';
import { app } from './index';

describe('Collector OTLP Endpoint', () => {
  test('POST /v1/traces returns 202 Accepted immediately', async () => {
    const payload = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: []
        }
      ]
    };

    const req = new Request('http://localhost:4318/v1/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await app.fetch(req);
    
    expect(res.status).toBe(202);
    const resJson = await res.json();
    expect(resJson).toEqual({});
  });

  test('POST /v1/traces handles malformed JSON without crashing', async () => {
    const req = new Request('http://localhost:4318/v1/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"malformed": "json"', // Missing closing bracket
    });

    // It should still return 202, and the background parse will fail silently
    const res = await app.fetch(req);
    
    expect(res.status).toBe(202);
  });
});
