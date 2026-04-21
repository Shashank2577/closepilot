import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';
import type { AgentJob } from './jobs.js';

export const agentQueue = new Queue<AgentJob>('agent-tasks', { connection: redisConnection });

export async function enqueueAgentJob(job: AgentJob): Promise<void> {
  await agentQueue.add(job.type, job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
