import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BullMQ
vi.mock('bullmq', () => {
  const add = vi.fn().mockResolvedValue({ id: '1' });
  return {
    Queue: function() {
      return {
        add
      };
    },
    // We export add here so we can access it in the test
    __mockAdd: add
  };
});

// Mock redis connection
vi.mock('./redis.js', () => ({
  redisConnection: {},
}));

// Import after mocks
import { enqueueAgentJob, agentQueue } from './queue.js';
import * as bullmq from 'bullmq';

describe('Queue Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enqueue an agent job with correct parameters', async () => {
    const job = {
      type: 'RunEnrichment' as const,
      dealId: 'deal-123',
    };

    await enqueueAgentJob(job);

    expect((bullmq as any).__mockAdd).toHaveBeenCalledWith(
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
});
