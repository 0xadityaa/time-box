import { expect, test, describe, mock } from 'bun:test';

// Set up spies
const traceCreateManySpy = mock(() => Promise.resolve());
const spanCreateManySpy = mock(() => Promise.resolve());
const transactionSpy = mock((queries: any[]) => Promise.all(queries));
const s3SendSpy = mock(() => Promise.resolve());

// Mock dependencies
mock.module('@prisma/client', () => {
  return {
    PrismaClient: class {
      $transaction = transactionSpy;
      trace = { createMany: traceCreateManySpy };
      span = { createMany: spanCreateManySpy };
    }
  };
});

mock.module('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = s3SendSpy;
    },
    PutObjectCommand: class {}
  };
});

describe('Collector Payload Batch Processor', () => {
  test('should process valid OTLP batch without content capture', async () => {
    const { processOtlpPayloadBatch } = await import('./processor');
    
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

    await expect(processOtlpPayloadBatch([payload], false)).resolves.toBeUndefined();
    
    expect(transactionSpy).toHaveBeenCalled();
    expect(traceCreateManySpy).toHaveBeenCalled();
    expect(spanCreateManySpy).toHaveBeenCalled();
    expect(s3SendSpy).not.toHaveBeenCalled();
  });
});
