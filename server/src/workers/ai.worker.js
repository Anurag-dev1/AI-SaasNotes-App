const { Worker } = require('bullmq');
const { queueClient } = require('../config/redis');
const aiService = require('../services/ai.service');
const NoteRepository = require('../repositories/note.repository');
const logger = require('../config/logger');
const env = require('../config/env');

let worker;
let heartbeatInterval;

exports.startWorker = () => {
  worker = new Worker('ai-jobs', async (job) => {
    const { tenantId, noteId, content } = job.data;
    const repo = new NoteRepository(tenantId);
    
    try {
      await repo.updateAiResult(noteId, { aiStatus: 'processing' });
      
      const [aiSummary, embedding] = await Promise.all([
        aiService.summarize(content),
        aiService.generateEmbedding(content)
      ]);
      
      await repo.updateAiResult(noteId, {
        aiSummary,
        embedding,
        aiStatus: 'completed'
      });
      
      logger.info(`Processed AI job ${job.id} for note ${noteId}`);
    } catch (error) {
      await repo.updateAiResult(noteId, { aiStatus: 'failed' });
      logger.error(`AI job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }, {
    connection: queueClient,
    concurrency: env.WORKER_CONCURRENCY || 5
  });

  worker.on('error', err => {
    logger.error(`Worker error: ${err.message}`);
  });

  heartbeatInterval = setInterval(async () => {
    try {
      await queueClient.set('worker:heartbeat', new Date().toISOString());
    } catch (e) {
      logger.error('Failed to set heartbeat');
    }
  }, 30000);

  logger.info('AI Worker started successfully');
};

exports.stopWorker = async () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (worker) {
    await worker.close();
    logger.info('AI Worker stopped');
  }
};
