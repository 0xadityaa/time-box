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

export async function processOtlpPayloadBatch(payloads: any[], captureContent = false) {
  const spansToInsert: any[] = [];
  const tracesToInsert: Map<string, any> = new Map();
  const minioUploadPromises: Promise<any>[] = [];

  for (const payload of payloads) {
    if (!payload?.resourceSpans) continue;

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
            payloadUri = `minio://traces/${objectKey}`;
            
            const client = getS3Client();
            minioUploadPromises.push(
              client.send(new PutObjectCommand({
                Bucket: 'traces',
                Key: objectKey,
                Body: JSON.stringify(span),
                ContentType: 'application/json',
              })).catch(e => console.error('MinIO Upload Error:', e))
            );
          }
          
          const startNano = span.startTimeUnixNano;
          const startTime = startNano ? new Date(Number(BigInt(startNano) / 1000000n)) : new Date();
          
          const endNano = span.endTimeUnixNano;
          const endTime = endNano ? new Date(Number(BigInt(endNano) / 1000000n)) : null;

          // Track unique traces (last seen end time max logic)
          const existingTrace = tracesToInsert.get(traceId);
          let mergedEndTime = endTime;
          if (existingTrace?.endTime && endTime) {
             mergedEndTime = existingTrace.endTime > endTime ? existingTrace.endTime : endTime;
          } else if (existingTrace?.endTime) {
             mergedEndTime = existingTrace.endTime;
          }

          tracesToInsert.set(traceId, {
            id: traceId,
            startTime: existingTrace?.startTime || startTime,
            endTime: mergedEndTime || undefined,
          });

          const compositeId = `${traceId}:${spanId}`;
          const parentSpanId = span.parentSpanId ? `${traceId}:${span.parentSpanId}` : null;
          
          spansToInsert.push({
            id: compositeId,
            spanId, // Provided schema was updated
            traceId,
            parentSpanId,
            name: span.name || 'unnamed',
            startTime,
            endTime: endTime || undefined,
            latencyMs,
            genAiSystem,
            inputTokens,
            outputTokens,
            payloadUri,
          });
        }
      }
    }
  }

  if (minioUploadPromises.length > 0) {
    await Promise.allSettled(minioUploadPromises);
  }

  if (tracesToInsert.size === 0 && spansToInsert.length === 0) return;

  try {
    await prisma.$transaction([
      prisma.trace.createMany({
        data: Array.from(tracesToInsert.values()),
        skipDuplicates: true,
      }),
      prisma.span.createMany({
        data: spansToInsert,
        skipDuplicates: true,
      })
    ]);
  } catch (dbErr) {
    console.error(`Failed to batch insert to Postgres (${spansToInsert.length} spans):`, dbErr);
    throw dbErr; // Rethrow to allow TraceQueue to retry
  }
}
