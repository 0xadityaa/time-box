# Time-Box: AI Observability Platform

## Project Philosophy
1. **Non-Blocking Interception (The Golden Rule):** The agent or application must never wait for the observability layer. Telemetry emission happens out-of-band via fire-and-forget mechanisms.
2. **Privacy by Default:** Raw payloads (prompts, RAG context, completions) often contain PII or sensitive data. By default, `time-box` redacts payload content, requiring explicit user opt-in (aligning with OpenTelemetry `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true`).
3. **Unified E2E Tracing (W3C Standard):** Distributed tracing is achieved using standard W3C `traceparent` headers to propagate trace IDs across network boundaries (Agent -> MCP -> Vector DB).
4. **Dual-Storage Structural Integrity:** Splitting the storage model prevents massive LLM context windows from crippling relational databases. Metadata lives in PostgreSQL; heavy unstructured JSON payloads live in MinIO (S3-compatible blob storage).
5. **Standardized Ingestion (OTLP):** Instead of custom framework plugins, the ingestion layer is fully OpenTelemetry Protocol (OTLP/HTTP) compliant, allowing any standard OTel exporter to stream directly to `time-box` out-of-the-box.

## Implementation Philosophy (The 4-Step Rule)
For EVERY implementation step, coding agents MUST figure out and document the following:
1. **The Change:** What change is needed for this to work?
2. **Architecture Alignment:** How will making this needed change affect and shape overall architecture and design? Does it align with the Golden Rule? Is it consistent with pre-aligned architecture and OTLP patterns?
3. **Validation & Replication:** Upon making this change, how to validate it? How to ensure this validation is replicable locally for manual verification? Document steps to do so after every major implementation completion.
4. **Regression Catching (Unit Tests):** Add unit tests upon final confirmation after the manual validation on local, to catch regressions caused in further development.

## Architecture Outline
- **Ingestion:** Bun / Hono Collector sidecar.
- **SDK:** `@time-box/core` wrapper for manual async firing, otherwise rely on standard Native OTel SDKs.
- **Storage:** Postgres (Traces/Spans metadata via Prisma) + MinIO (Heavy Blob context).
- **Dashboard:** Next.js + Tailwind + Shadcn UI.
