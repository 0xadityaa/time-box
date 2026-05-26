import { trace, context, propagation, defaultTextMapSetter, defaultTextMapGetter } from '@opentelemetry/api';
import { BasicTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

let provider: BasicTracerProvider | null = null;

export interface InitOptions {
  serviceName: string;
  endpoint?: string;
}

export function initTimeBox(options: InitOptions) {
  if (provider) {
    return; // Already initialized
  }

  provider = new BasicTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.serviceName,
    }),
  });

  const exporter = new OTLPTraceExporter({
    url: options.endpoint || 'http://localhost:4318/v1/traces',
  });

  // Use BatchSpanProcessor for non-blocking asynchronous dispatch
  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 512,
    scheduledDelayMillis: 1000, // Export every second
  }));

  const { AsyncHooksContextManager } = require('@opentelemetry/context-async-hooks');
  const contextManager = new AsyncHooksContextManager();
  contextManager.enable();
  
  provider.register({ contextManager });
  
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
}

/**
 * Extracts W3C trace context from HTTP headers/carrier and returns an active context.
 */
export function extractContext(carrier: Record<string, string>) {
  return propagation.extract(context.active(), carrier, defaultTextMapGetter);
}

/**
 * Injects the current active W3C trace context into HTTP headers/carrier.
 */
export function injectContext(carrier: Record<string, string>) {
  propagation.inject(context.active(), carrier, defaultTextMapSetter);
  return carrier;
}

export function getTracer(name = 'time-box-core') {
  return trace.getTracer(name);
}
