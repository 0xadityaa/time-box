'use server';

import { prisma } from '@time-box/db';
import { format, subHours } from 'date-fns';

export async function getDashboardMetrics() {
  const now = new Date();
  const last24h = subHours(now, 24);

  // Fetch metrics
  const hourlyData = await prisma.hourlyMetrics.findMany({
    where: { timestamp: { gte: last24h } },
    orderBy: { timestamp: 'asc' },
  });

  // KPI Calculations
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalErrors = 0;
  let totalSuccess = 0;

  // Tokens Over Time
  const tokensMap = new Map<string, { date: string; Input: number; Output: number }>();
  
  // System Error Distribution
  const errorMap = new Map<string, number>();

  // Latency By System (taking max P99 for the day)
  const systemLatencyMap = new Map<string, { name: string; P50: number; P90: number; P99: number }>();

  hourlyData.forEach(m => {
    totalInputTokens += m.inputTokens;
    totalOutputTokens += m.outputTokens;
    totalErrors += m.errorCount;
    totalSuccess += m.successCount;

    // Line Chart Aggregation
    const timeKey = format(m.timestamp, 'HH:mm');
    if (!tokensMap.has(timeKey)) {
      tokensMap.set(timeKey, { date: timeKey, Input: 0, Output: 0 });
    }
    const bucket = tokensMap.get(timeKey)!;
    bucket.Input += m.inputTokens;
    bucket.Output += m.outputTokens;

    // Donut Chart Aggregation
    if (m.errorCount > 0) {
      errorMap.set(m.genAiSystem, (errorMap.get(m.genAiSystem) || 0) + m.errorCount);
    }

    // Bar Chart Aggregation
    if (!systemLatencyMap.has(m.genAiSystem)) {
      systemLatencyMap.set(m.genAiSystem, { name: m.genAiSystem, P50: m.p50LatencyMs, P90: m.p90LatencyMs, P99: m.p99LatencyMs });
    } else {
      const current = systemLatencyMap.get(m.genAiSystem)!;
      current.P50 = Math.max(current.P50, m.p50LatencyMs);
      current.P90 = Math.max(current.P90, m.p90LatencyMs);
      current.P99 = Math.max(current.P99, m.p99LatencyMs);
    }
  });

  // Calculate P99 Global roughly
  const globalP99 = Array.from(systemLatencyMap.values()).reduce((acc, v) => Math.max(acc, v.P99), 0);
  const totalTraces = await prisma.trace.count({ where: { startTime: { gte: last24h } } });

  const kpis = {
    totalTraces,
    totalTokens: totalInputTokens + totalOutputTokens,
    errorRate: totalErrors + totalSuccess > 0 ? (totalErrors / (totalErrors + totalSuccess)) * 100 : 0,
    globalP99,
  };

  const errorDistribution = Array.from(errorMap.entries()).map(([name, value]) => ({ name, value }));

  return {
    kpis,
    tokensOverTime: Array.from(tokensMap.values()),
    systemLatencies: Array.from(systemLatencyMap.values()),
    errorDistribution
  };
}
