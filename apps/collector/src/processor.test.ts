import { expect, test, describe, mock } from 'bun:test';
import { processOtlpPayloadBatch } from './processor';

mock.module('@prisma/client', () => {
  return {
    PrismaClient: class {
      $transaction = mock(() => Promise.resolve());
      trace = { createMany: mock(() => Promise.resolve()) };
      span = { createMany: mock(() => Promise.resolve()) };
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

describe('Collector Payload Batch Processor', () => {
  test('should process valid OTLP payloads via batching', async () => {
    const payloads = [{
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
    }];

    await expect(processOtlpPayloadBatch(payloads, false)).resolves.toBeUndefined();
  });
});
