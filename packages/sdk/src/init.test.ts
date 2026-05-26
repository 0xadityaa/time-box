import { expect, test, describe, beforeAll } from 'bun:test';
import { initTimeBox, injectContext, extractContext, getTracer } from './init';
import { context, trace } from '@opentelemetry/api';

describe('TimeBox SDK Init', () => {
  beforeAll(() => {
    initTimeBox({ serviceName: 'test-agent' });
  });

  test('should inject W3C traceparent into headers', () => {
    const tracer = getTracer();
    const headers: Record<string, string> = {};

    tracer.startActiveSpan('test-span', (span) => {
      injectContext(headers);
      span.end();
    });

    expect(headers).toHaveProperty('traceparent');
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  test('should extract W3C traceparent from headers', () => {
    const carrier = {
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    };

    const extractedCtx = extractContext(carrier);
    const spanCtx = trace.getSpan(extractedCtx)?.spanContext();

    // The current context won't immediately have an active span object 
    // unless we wrap it or extract it directly from the context API.
    // In OpenTelemetry JS, trace.getSpan() relies on context mapping.
    // A better way to test is to use trace.getSpanContext(extractedCtx).
    const directSpanCtx = trace.getSpanContext(extractedCtx);
    
    expect(directSpanCtx).toBeDefined();
    expect(directSpanCtx?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(directSpanCtx?.spanId).toBe('00f067aa0ba902b7');
  });
});
