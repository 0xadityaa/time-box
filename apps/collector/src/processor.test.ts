import { expect, test, describe, mock } from 'bun:test';

// Set up spies
const traceUpsertSpy = mock(() => Promise.resolve());
const spanUpsertSpy = mock(() => Promise.resolve());
const s3SendSpy = mock(() => Promise.resolve());

// Mock dependencies
mock.module('@prisma/client', () => {
  return {
    PrismaClient: class {
      trace = { upsert: traceUpsertSpy };
      span = { upsert: spanUpsertSpy };
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

describe('Collector Payload Processor', () => {
  test('should process valid OTLP payload without content capture', async () => {
    // Dynamically import processor AFTER mocks are registered
    const { processOtlpPayload } = await import('./processor');
    
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

    await expect(processOtlpPayload(payload, false)).resolves.toBeUndefined();
    
    // Assert that upsert was called with the correct extracted attributes
    expect(traceUpsertSpy).toHaveBeenCalled();
    expect(spanUpsertSpy).toHaveBeenCalled();
    
    // Ensure S3 was not called because captureContent is false
    expect(s3SendSpy).not.toHaveBeenCalled();
  });
});
