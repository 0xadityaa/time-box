import { expect, test, describe, mock } from 'bun:test';

// Set up spies
const traceCreateManySpy = mock(() => Promise.resolve());
const spanCreateManySpy = mock(() => Promise.resolve());
const transactionSpy = mock((queries: any[]) => Promise.all(queries));
const s3SendSpy = mock(() => Promise.resolve());

let mockCapturePayloads = false;

mock.module('./settings', () => ({
  isCapturePayloadsEnabled: () => mockCapturePayloads,
  startSettingsPoller: () => {}
}));

// Mock dependencies
mock.module('@time-box/db', () => {
  return {
    prisma: {
      $transaction: transactionSpy,
      trace: { createMany: traceCreateManySpy },
      span: { createMany: spanCreateManySpy }
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
    mockCapturePayloads = false;
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

    await expect(processOtlpPayloadBatch([payload])).resolves.toBeUndefined();
    
    expect(transactionSpy).toHaveBeenCalled();
    expect(traceCreateManySpy).toHaveBeenCalled();
    expect(spanCreateManySpy).toHaveBeenCalled();
    expect(s3SendSpy).not.toHaveBeenCalled();
  });

  test('should process valid OTLP batch with content capture', async () => {
    mockCapturePayloads = true;
    const { processOtlpPayloadBatch } = await import('./processor');
    
    const payload = {
      resourceSpans: [{
        scopeSpans: [{
          spans: [{
            traceId: 'trace-789',
            spanId: 'span-012',
            name: 'chat',
            startTimeUnixNano: '1680000000000000000',
            attributes: []
          }]
        }]
      }]
    };

    // Reset spy
    s3SendSpy.mockClear();

    await expect(processOtlpPayloadBatch([payload])).resolves.toBeUndefined();
    
    expect(s3SendSpy).toHaveBeenCalled();
  });
});
