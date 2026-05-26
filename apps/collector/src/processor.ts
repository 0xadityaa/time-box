import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();

let s3Client: S3Client | null = null;
function getS3Client() {
  if (s3Client) return s3Client;
  if (!process.env.MINIO_ENDPOINT && process.env.NODE_ENV === 'production') {
    throw new Error('MINIO_ENDPOINT must be set in production when captureContent is enabled');
  }
  s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });
  return s3Client;
}

export async function processOtlpPayload(payload: any, captureContent = false) {
  if (!payload?.resourceSpans) return;

  for (const rs of payload.resourceSpans) {
    for (const ss of rs.scopeSpans || []) {
      for (const span of ss.spans || []) {
        const traceId = span.traceId;
        const spanId = span.spanId;
        
        if (!traceId || !spanId) continue;
        
        const attributesMap = new Map<string, any>();
        for (const attr of span.attributes || []) {
          attributesMap.set(attr.key, attr.value);
        }

        const getAttrStr = (key: string) => attributesMap.get(key)?.stringValue;
        const getAttrInt = (key: string) => {
          const val = attributesMap.get(key)?.intValue;
          return (val !== undefined && val !== null) ? Number(val) : undefined;
        };
        
        const genAiSystem = getAttrStr('gen_ai.system');
        const inputTokens = getAttrInt('gen_ai.usage.input_tokens');
        const outputTokens = getAttrInt('gen_ai.usage.output_tokens');
        const latencyMs = getAttrInt('latency_ms');
        
        let payloadUri: string | undefined;
        
        if (captureContent) {
          const objectKey = `${traceId}/${spanId}.json`;
          try {
            const client = getS3Client();
            await client.send(new PutObjectCommand({
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
        
        // Parse unix nano strings via BigInt to avoid precision loss
        const startNano = span.startTimeUnixNano;
        const startTime = startNano ? new Date(Number(BigInt(startNano) / 1000000n)) : new Date();
        
        const endNano = span.endTimeUnixNano;
        const endTime = endNano ? new Date(Number(BigInt(endNano) / 1000000n)) : null;

        const compositeId = `${traceId}:${spanId}`;
        const parentSpanId = span.parentSpanId ? `${traceId}:${span.parentSpanId}` : null;
        const name = span.name || 'unnamed';

        try {
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

          await prisma.span.upsert({
            where: { id: compositeId },
            update: {
              name,
              latencyMs,
              genAiSystem,
              inputTokens,
              outputTokens,
              payloadUri,
              endTime: endTime || undefined,
            },
            create: {
              id: compositeId,
              spanId, // Assuming schema was updated to include this separately
              traceId,
              parentSpanId,
              name,
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
