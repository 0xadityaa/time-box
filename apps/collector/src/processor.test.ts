import { expect, test, describe, mock } from 'bun:test';
import { processOtlpPayload } from './processor';

// Mock dependencies
mock.module('@prisma/client', () => {
  return {
    PrismaClient: class {
      trace = { upsert: mock(() => Promise.resolve()) };
      span = { upsert: mock(() => Promise.resolve()) };
    }
  };
});

mock.module('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = mock(() => Promise.resolve());
    },
    PutObjectCommand: class {}
  };
});

describe('Collector Payload Processor', () => {
  test('should process valid OTLP payload without content capture', async () => {
    const payload = {
      resourceSpans: [{
        scopeSpans: [{
          spans: [{
            traceId: 'trace-123',
            spanId: 'span-456',
            name: 'chat',
            startTimeUnixNano: '1680000000000000000',
            attributes: [
              { key: 'gen_ai.system', value: { stringValue: 'openai' } },
              { key: 'latency_ms', value: { intValue: '120' } }
            ]
          }]
        }]
      }]
    };

    // We only test that it doesn't throw and parses properly, because 
    // the module mocking is injected globally and we just want to ensure it resolves.
    await expect(processOtlpPayload(payload, false)).resolves.toBeUndefined();
  });
});
