import { expect, test, describe, mock } from 'bun:test';

const findManySpy = mock(() => Promise.resolve([
  { genAiSystem: 'openai', inputTokens: 10, outputTokens: 20, latencyMs: 100, status: 'OK' },
  { genAiSystem: 'openai', inputTokens: 15, outputTokens: 25, latencyMs: 150, status: 'OK' },
  { genAiSystem: 'anthropic', inputTokens: 5, outputTokens: 5, latencyMs: 200, status: 'ERROR' }
]));

const upsertSpy = mock(() => Promise.resolve());

mock.module('@time-box/db', () => ({
  prisma: {
    span: { findMany: findManySpy },
    hourlyMetrics: { upsert: upsertSpy }
  }
}));

describe('Aggregator', () => {
  test('should aggregate metrics and upsert', async () => {
    const { aggregateHourlyMetrics } = await import('./aggregator');
    await aggregateHourlyMetrics();

    expect(findManySpy).toHaveBeenCalled();
    expect(upsertSpy).toHaveBeenCalledTimes(2); // One for openai, one for anthropic
    
    // Validate openai aggregation
    const openaiCall = upsertSpy.mock.calls.find(call => call[0].where.timestamp_genAiSystem.genAiSystem === 'openai');
    expect(openaiCall).toBeDefined();
    expect(openaiCall[0].update.inputTokens).toBe(25);
    expect(openaiCall[0].update.outputTokens).toBe(45);
    expect(openaiCall[0].update.successCount).toBe(2);
    expect(openaiCall[0].update.errorCount).toBe(0);
    
    // Validate anthropic aggregation
    const anthropicCall = upsertSpy.mock.calls.find(call => call[0].where.timestamp_genAiSystem.genAiSystem === 'anthropic');
    expect(anthropicCall).toBeDefined();
    expect(anthropicCall[0].update.inputTokens).toBe(5);
    expect(anthropicCall[0].update.outputTokens).toBe(5);
    expect(anthropicCall[0].update.successCount).toBe(0);
    expect(anthropicCall[0].update.errorCount).toBe(1);
  });
});
