import { SpanStatusCode } from '@opentelemetry/api';
import { getTracer } from './init';

export interface TraceAttributes {
  [key: string]: any;
  'gen_ai.system'?: string;
  'gen_ai.usage.input_tokens'?: number;
  'gen_ai.usage.output_tokens'?: number;
  'gen_ai.request.model'?: string;
}

export async function trace<T>(
  name: string,
  attributes: TraceAttributes | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }
    
    const startTime = performance.now();
    try {
      const result = await fn();
      const latencyMs = Math.round(performance.now() - startTime);
      span.setAttribute('latency_ms', latencyMs);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
