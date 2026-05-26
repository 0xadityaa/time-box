# Low-Level Design (LLD): Collector Processor

## Implementation Details

### Data Extraction (`apps/collector/src/processor.ts`)
1. **Timestamp Precision**: OTLP transmits timestamps as Unix Nanoseconds encoded as strings. To prevent integer overflow and silent precision loss (`> Number.MAX_SAFE_INTEGER`), the processor uses `BigInt(span.startTimeUnixNano) / 1000000n` before casting to a `Date` object.
2. **Attribute Mapping**: We iterate over the key-value attributes. Safe extraction of `intValue` is done strictly via `!== undefined && !== null` to prevent valid numeric `0` values from being discarded due to JavaScript falsy coercion.
3. **Upsert Logic**: 
   - `id`: Constructed dynamically via `${traceId}:${spanId}`.
   - Updates target all volatile fields (`latencyMs`, `inputTokens`, `outputTokens`, `genAiSystem`, `name`).

### Test Coverage (`apps/collector/src/processor.test.ts`)
- Uses `bun:test` `mock.module` to mock `@prisma/client` and `@aws-sdk/client-s3`.
- Important: The processor logic is loaded dynamically via `await import('./processor')` *after* the mocks are registered to avoid static evaluation hitting real dependencies.
- Tests assert that Prisma spy functions are called correctly, and S3 spy functions are avoided when `captureContent` is false.
