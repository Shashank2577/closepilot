import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock redis connection before queue import
vi.mock('./redis.js', () => ({
  redisConnection: {},
}));

// Mock BullMQ — use a stable spy on the instance's add method
const mockAdd = vi.fn().mockResolvedValue({ id: '1' });
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: mockAdd })),
}));

// Import after mocks
import { enqueueAgentJob, agentQueue } from './queue.js';

describe('Queue Setup', () => {
  beforeEach(() => {
    mockAdd.mockClear();
  });

  it('should enqueue an agent job with correct parameters', async () => {
    const job = {
      type: 'RunEnrichment' as const,
      dealId: 'deal-123',
    };

    await enqueueAgentJob(job);

    expect(mockAdd).toHaveBeenCalledWith(
      'RunEnrichment',
      job,
      expect.objectContaining({
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      })
    );
  });

  it('should apply retry config for any job type', async () => {
    const job = {
      type: 'RunCRMSync' as const,
      dealId: 'deal-456',
    };

    await enqueueAgentJob(job);

    expect(mockAdd).toHaveBeenCalledWith(
      'RunCRMSync',
      job,
      expect.objectContaining({ attempts: 3 })
    );
  });
});
