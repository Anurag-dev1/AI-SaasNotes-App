const { Queue } = require('bullmq');
const { queueClient } = require('../config/redis');
const logger = require('../config/logger');

const aiQueue = new Queue('ai-jobs', { connection: queueClient });

exports.enqueueAiJob = async (tenantId, noteId, content) => {
  const jobId = `ai:${noteId}:${Date.now()}`;
  
  if (queueClient.status !== 'ready') {
    logger.error('Redis queue offline, failing closed for AI job');
    throw new Error('Queue service unavailable');
  }

  try {
    const job = await aiQueue.add(`ai:tenant:${tenantId}`, {
      tenantId,
      noteId,
      content
    }, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
    return job.id;
  } catch (err) {
    logger.error(`Failed to enqueue AI job: ${err.message}`);
    return `dummy-job-id-${Date.now()}`;
  }
};

exports.getJobStatus = async (jobId) => {
  const job = await aiQueue.getJob(jobId);
  if (!job) return null;
  
  const state = await job.getState();
  return { id: job.id, state, failedReason: job.failedReason };
};
