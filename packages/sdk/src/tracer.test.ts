import { expect, test, describe, beforeAll } from 'bun:test';
import { trace } from './tracer';
import { initTimeBox } from './init';

describe('TimeBox SDK Tracer Wrapper', () => {
  beforeAll(() => {
    initTimeBox({ serviceName: 'test-agent' });
  });

  test('should successfully wrap execution and return result', async () => {
    const result = await trace('my-span', { 'gen_ai.system': 'openai' }, async () => {
      return { msg: 'success' };
    });
    
    expect(result.msg).toBe('success');
  });

  test('should catch exceptions and throw', async () => {
    let errorCaught = false;
    try {
      await trace('failing-span', {}, async () => {
        throw new Error('LLM failed');
      });
    } catch (e: any) {
      errorCaught = true;
      expect(e.message).toBe('LLM failed');
    }
    expect(errorCaught).toBe(true);
  });
});
