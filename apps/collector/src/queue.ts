import { processOtlpPayloadBatch } from './processor';

// Simple in-memory backpressure queue
export class TraceQueue {
  private buffer: any[] = [];
  private readonly MAX_SIZE = 50000;
  private readonly FLUSH_INTERVAL_MS = 1000; // 1 second
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor() {
    this.start();
  }

  public enqueue(payload: any) {
    if (this.buffer.length >= this.MAX_SIZE) {
      console.warn('WARN: Trace queue is full! Dropping trace payload due to backpressure.');
      return;
    }
    this.buffer.push(payload);
  }

  private start() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => console.error('Error during trace queue flush:', err));
    }, this.FLUSH_INTERVAL_MS);
  }

  public stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  public async flush() {
    if (this.isProcessing || this.buffer.length === 0) return;
    
    this.isProcessing = true;
    const batch = [...this.buffer];
    this.buffer = [];

    try {
      const captureContent = process.env.OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT === 'true';
      await processOtlpPayloadBatch(batch, captureContent);
    } catch (err) {
      console.error('Failed to process batch:', err);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const traceQueue = new TraceQueue();
