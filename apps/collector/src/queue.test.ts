import { expect, test, describe, mock, beforeEach } from 'bun:test';

// Mock dependencies
const mockProcessOtlpPayloadBatch = mock(() => Promise.resolve());
mock.module('./processor', () => {
  return {
    processOtlpPayloadBatch: mockProcessOtlpPayloadBatch,
  };
});

describe('TraceQueue', () => {
  beforeEach(() => {
    mockProcessOtlpPayloadBatch.mockClear();
  });

  test('should enqueue items and not drop if under limit', async () => {
    const { TraceQueue } = await import('./queue');
    const queue = new TraceQueue();
    queue.enqueue({ test: 1 });
    queue.enqueue({ test: 2 });
    
    // Using any to test internal state
    expect((queue as any).buffer.length).toBe(2);
  });

  test('should drop items if over MAX_SIZE limit', async () => {
    const { TraceQueue } = await import('./queue');
    const queue = new TraceQueue();
    // Override MAX_SIZE for test
    (queue as any).MAX_SIZE = 2;
    
    queue.enqueue({ test: 1 });
    queue.enqueue({ test: 2 });
    queue.enqueue({ test: 3 }); // should be dropped
    
    expect((queue as any).buffer.length).toBe(2);
    expect((queue as any).buffer[0].test).toBe(1);
    expect((queue as any).buffer[1].test).toBe(2);
  });

  test('should flush items to processor', async () => {
    const { TraceQueue } = await import('./queue');
    const queue = new TraceQueue();
    queue.enqueue({ test: 1 });
    
    await queue.flush();
    
    expect(mockProcessOtlpPayloadBatch).toHaveBeenCalled();
    expect(mockProcessOtlpPayloadBatch).toHaveBeenCalledWith([{ test: 1 }]);
    expect((queue as any).buffer.length).toBe(0);
  });

  test('should requeue items if processor fails', async () => {
    const { TraceQueue } = await import('./queue');
    const queue = new TraceQueue();
    
    mockProcessOtlpPayloadBatch.mockImplementationOnce(() => Promise.reject(new Error('DB Down')));
    
    queue.enqueue({ test: 1 });
    
    await queue.flush(); // This handles the rejection internally and requeues
    
    // Buffer should still contain the item
    expect((queue as any).buffer.length).toBe(1);
    expect((queue as any).buffer[0].test).toBe(1);
  });
});
