# Low-Level Design (LLD): time-box/core SDK

## Implementation Details

### Setup (`packages/sdk/src/init.ts`)
1. **ESM vs CJS**: To support Next.js 14+ natively alongside raw scripts, the SDK utilizes `tsup` configuration to transpile and bundle both `dist/index.mjs` and `dist/index.js`.
2. **Context Manager**: `AsyncHooksContextManager` is utilized natively through static `import`s to avoid runtime dynamic `require()` evaluation breaking ESM resolvers.
3. **API Key Integration**: When initialized, the `apiKey` configuration option directly injects `x-api-key` into the OpenTelemetry Protocol exporter headers. This aligns with the custom Auth Middleware built in the `apps/collector`.
4. **W3C Propagator**: Extracts W3C `traceparent` headers from incoming `carrier` HTTP payloads (used when agents fetch data from each other), enabling deeply nested distributed tracing trees.
