import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

export async function processOtlpPayload(payload: any, captureContent = false) {
  if (!payload?.resourceSpans) return;

  for (const rs of payload.resourceSpans) {
    for (const ss of rs.scopeSpans || []) {
      for (const span of ss.spans || []) {
        const traceId = span.traceId;
        const spanId = span.spanId;
        
        if (!traceId || !spanId) continue;
        
        // Map OTLP span attributes to our schema
        const attributes = span.attributes || [];
        const getAttrStr = (key: string) => attributes.find((a: any) => a.key === key)?.value?.stringValue;
        const getAttrInt = (key: string) => {
          const val = attributes.find((a: any) => a.key === key)?.value?.intValue;
          return val ? Number(val) : undefined;
        };
        
        const genAiSystem = getAttrStr('gen_ai.system');
        const inputTokens = getAttrInt('gen_ai.usage.input_tokens');
        const outputTokens = getAttrInt('gen_ai.usage.output_tokens');
        const latencyMs = getAttrInt('latency_ms');
        
        let payloadUri: string | undefined;
        
        if (captureContent) {
          // If the user opts-in, save the entire payload blob to MinIO
          const objectKey = `${traceId}/${spanId}.json`;
          try {
            await s3Client.send(new PutObjectCommand({
              Bucket: 'traces',
              Key: objectKey,
              Body: JSON.stringify(span),
              ContentType: 'application/json',
            }));
            payloadUri = `minio://traces/${objectKey}`;
          } catch (e) {
            console.error('Failed to write context payload to MinIO:', e);
          }
        }
        
        const startTime = new Date(Number(span.startTimeUnixNano || 0) / 1000000);
        const endTimeStr = span.endTimeUnixNano;
        const endTime = endTimeStr ? new Date(Number(endTimeStr) / 1000000) : null;

        try {
          // UPSERT Trace to ensure it exists
          await prisma.trace.upsert({
            where: { id: traceId },
            update: {
              endTime: endTime || undefined,
            },
            create: {
              id: traceId,
              startTime,
              endTime: endTime || undefined,
            }
          });

          // INSERT/UPSERT Span
          await prisma.span.upsert({
            where: { id: spanId },
            update: {
              latencyMs,
              inputTokens,
              outputTokens,
              payloadUri,
              endTime: endTime || undefined,
            },
            create: {
              id: spanId,
              traceId,
              parentSpanId: span.parentSpanId || null,
              name: span.name || 'unnamed',
              startTime,
              endTime: endTime || undefined,
              latencyMs,
              genAiSystem,
              inputTokens,
              outputTokens,
              payloadUri,
            }
          });
        } catch (dbErr) {
          console.error(`Failed to write trace/span to Postgres [Trace: ${traceId}, Span: ${spanId}]:`, dbErr);
        }
      }
    }
  }
}
