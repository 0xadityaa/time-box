# Low-Level Design (LLD): Trace Queue

## Implementation Details

### Queue Logic (`apps/collector/src/queue.ts`)
1. **Concurrency Lock**: `isProcessing` flag is used to prevent concurrent flushes from overlapping and stealing/duplicating batches if a database write takes longer than the `FLUSH_INTERVAL_MS`.
2. **Re-Queuing Mechanics**: In the `catch` block of `flush()`, the batch is unshifted back to the front of `this.buffer`. A subsequent length check ensures the buffer is truncated if it exceeds `MAX_SIZE` (which guarantees the backpressure circuit breaker is still respected during outage retry floods).
3. **Lifecycle Management**: The queue timer requires an explicit `start()` invocation from `index.ts`. This makes the singleton strictly stateless on import, which is critical for unit tests calling `mock.module` and avoiding leaking timers into the test runner.

### Test Coverage (`apps/collector/src/queue.test.ts`)
- Mocks `processOtlpPayloadBatch` internally.
- Validates the truncation of elements when pushing beyond `MAX_SIZE`.
- Validates that `this.buffer` remains intact (simulated re-queue) when the processor throws an unhandled rejection.
