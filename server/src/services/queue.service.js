const { Queue } = require('bullmq');
const { queueClient } = require('../config/redis');
const logger = require('../config/logger');

const aiQueue = new Queue('ai-jobs', { connection: queueClient });

async function fallbackProcessAiJob(tenantId, noteId, content) {
  try {
    const aiService = require('./ai.service');
    const NoteRepository = require('../repositories/note.repository');
    const repo = new NoteRepository(tenantId);
    
    // Simulate some delay for processing status (optional)
    await repo.updateById(noteId, { aiStatus: 'processing' });
    
    const summary = await aiService.summarize(content);
    const embedding = await aiService.generateEmbedding(content);
    
    await repo.updateById(noteId, {
      aiStatus: 'completed',
      aiSummary: summary,
      embedding: embedding
    });
    
    const cacheService = require('./cache.service');
    await cacheService.invalidateNote(tenantId, noteId);
  } catch (error) {
    logger.error(`Fallback AI processing failed: ${error.message}`);
    const NoteRepository = require('../repositories/note.repository');
    const repo = new NoteRepository(tenantId);
    await repo.updateById(noteId, { aiStatus: 'failed' }).catch(() => {});
  }
}

exports.enqueueAiJob = async (tenantId, noteId, content) => {
  const jobId = `ai:${noteId}:${Date.now()}`;
  
  if (queueClient.status !== 'ready') {
    logger.warn('Redis queue offline, executing inline fallback for AI job');
    // Run asynchronously without blocking
    fallbackProcessAiJob(tenantId, noteId, content).catch(err => logger.error(err));
    return `dummy-job-id-${Date.now()}`;
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
