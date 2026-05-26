import { prisma } from '@time-box/db';

let isAggregating = false;

export async function aggregateHourlyMetrics() {
  if (isAggregating) return;
  isAggregating = true;
  
  try {
    const now = new Date();
    // Truncate to the start of the current UTC hour
    const currentHour = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
    
    // We process the previous hour
    const targetHour = new Date(currentHour.getTime() - 60 * 60 * 1000);
    const targetEnd = currentHour;

    console.log(`[Aggregator] Starting hourly aggregation for interval ${targetHour.toISOString()} to ${targetEnd.toISOString()}`);
    // 1. Fetch all spans in this time window
    const spans = await prisma.span.findMany({
      where: {
        startTime: {
          gte: targetHour,
          lt: targetEnd,
        },
      },
      select: {
        genAiSystem: true,
        inputTokens: true,
        outputTokens: true,
        latencyMs: true,
        status: true,
      }
    });

    if (spans.length === 0) {
      console.log(`[Aggregator] No spans found for this interval.`);
      return;
    }

    // 2. Group by genAiSystem
    const grouped = new Map<string, typeof spans>();
    for (const span of spans) {
      const system = span.genAiSystem || 'unknown';
      if (!grouped.has(system)) grouped.set(system, []);
      grouped.get(system)!.push(span);
    }

    // 3. Compute metrics per system
    for (const [system, systemSpans] of grouped.entries()) {
      let inputTokens = 0;
      let outputTokens = 0;
      let successCount = 0;
      let errorCount = 0;
      const latencies: number[] = [];

      for (const s of systemSpans) {
        if (s.inputTokens) inputTokens += s.inputTokens;
        if (s.outputTokens) outputTokens += s.outputTokens;
        
        if (s.latencyMs !== null && s.latencyMs !== undefined) {
          latencies.push(s.latencyMs);
        }

        if (s.status === 'ERROR') errorCount++;
        else successCount++; // Treat OK and UNSET as success by default unless explicitly ERROR
      }

      latencies.sort((a, b) => a - b);
      
      const getPercentile = (p: number) => {
        if (latencies.length === 0) return 0;
        const index = Math.ceil((p / 100) * latencies.length) - 1;
        return latencies[Math.max(0, index)];
      };

      const p50 = getPercentile(50);
      const p90 = getPercentile(90);
      const p99 = getPercentile(99);

      // 4. Upsert into HourlyMetrics
      await prisma.hourlyMetrics.upsert({
        where: {
          timestamp_genAiSystem: {
            timestamp: targetHour,
            genAiSystem: system,
          }
        },
        update: {
          inputTokens,
          outputTokens,
          p50LatencyMs: p50,
          p90LatencyMs: p90,
          p99LatencyMs: p99,
          successCount,
          errorCount,
        },
        create: {
          timestamp: targetHour,
          genAiSystem: system,
          inputTokens,
          outputTokens,
          p50LatencyMs: p50,
          p90LatencyMs: p90,
          p99LatencyMs: p99,
          successCount,
          errorCount,
        }
      });
      console.log(`[Aggregator] Upserted metrics for ${system}: ${systemSpans.length} spans.`);
    }
    
  } catch (err) {
    console.error(`[Aggregator] Failed to aggregate metrics:`, err);
  } finally {
    isAggregating = false;
  }
}

// Run aggregation every hour
export function startAggregator() {
  // Run once on startup for the previous hour just in case
  aggregateHourlyMetrics();
  
  // 60 minutes * 60 seconds * 1000 ms
  setInterval(aggregateHourlyMetrics, 60 * 60 * 1000);
}
