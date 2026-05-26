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
            const objectKey = `${traceId}/${spanId}.json`;
            payloadUri = `minio://traces/${objectKey}`;
            
            minioUploadPromises.push(
              s3Client.send(new PutObjectCommand({
                Bucket: 'traces',
                Key: objectKey,
                Body: JSON.stringify(span),
                ContentType: 'application/json',
              })).catch(e => console.error('MinIO Upload Error:', e))
            );
          }
          
          const startTime = new Date(Number(span.startTimeUnixNano || 0) / 1000000);
          const endTimeStr = span.endTimeUnixNano;
          const endTime = endTimeStr ? new Date(Number(endTimeStr) / 1000000) : null;

          // Track unique traces (last seen end time)
          tracesToInsert.set(traceId, {
            id: traceId,
            startTime: tracesToInsert.get(traceId)?.startTime || startTime,
            endTime: endTime || undefined,
          });

          spansToInsert.push({
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
          });
        }
      }
    }
  }

  // Await minio uploads
  if (minioUploadPromises.length > 0) {
    await Promise.allSettled(minioUploadPromises);
  }

  if (tracesToInsert.size === 0 && spansToInsert.length === 0) return;

  try {
    // Execute Batch DB transaction
    await prisma.$transaction([
      // Note: Prisma does not have 'createMany' with 'upsert' conflict resolution in Postgres easily,
      // so for pure batch ingestion we either createMany skipDuplicates: true or upsert individually.
      // Assuming write-heavy spans and trace records:
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
  }
}
