const NoteRepository = require('../repositories/note.repository');
const cacheService = require('../services/cache.service');
const queueService = require('../services/queue.service');
const quotaService = require('../services/quota.service');
const crypto = require('crypto');
const { AppError } = require('../middleware/error-handler');

exports.list = async (req, res, next) => {
  try {
    const repo = new NoteRepository(req.tenantId);
    const { page = 1, limit = 10, tag } = req.query;
    
    const queryStr = JSON.stringify({ page, limit, tag, ownerId: req.user.id, role: req.user.role });
    const queryHash = crypto.createHash('md5').update(queryStr).digest('hex');

    let result = await cacheService.getNoteList(req.tenantId, queryHash);
    if (!result) {
      result = await repo.findAll({ page, limit, tag, ownerId: req.user.id, role: req.user.role });
      await cacheService.setNoteList(req.tenantId, queryHash, result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const quota = await quotaService.checkAndIncrement(req.tenantId);
    if (!quota.allowed) {
      throw new AppError(429, 'AI quota exceeded for this hour');
    }

    const repo = new NoteRepository(req.tenantId);
    const note = await repo.create({ ...req.body, ownerId: req.user.id, aiStatus: 'pending' });

    const jobId = await queueService.enqueueAiJob(req.tenantId, note._id, note.content);
    await cacheService.invalidateNoteList(req.tenantId);

    res.status(202).json({ note, jobId });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const cachedNote = await cacheService.getNote(req.tenantId, req.params.id);
    if (cachedNote) {
      // IDOR Fix: Enforce ownership check even on cache hits
      if (req.user.role !== 'Admin' && String(cachedNote.ownerId) !== String(req.user.id)) {
        throw new AppError(403, 'You do not have permission to view this note');
      }
      return res.status(200).json({ note: cachedNote });
    }

    const repo = new NoteRepository(req.tenantId);
    const note = await repo.findById(req.params.id, req.user.id, req.user.role);
    
    if (!note) {
      throw new AppError(404, 'Note not found');
    }

    await cacheService.setNote(req.tenantId, req.params.id, note);
    res.status(200).json({ note });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const repo = new NoteRepository(req.tenantId);
    const existing = await repo.findById(req.params.id, req.user.id, req.user.role);
    if (!existing) {
      throw new AppError(404, 'Note not found');
    }

    const contentChanged = req.body.content && req.body.content !== existing.content;
    const updateData = { ...req.body };
    
    if (contentChanged) {
      updateData.aiStatus = 'pending';
    }

    const note = await repo.updateById(req.params.id, updateData, req.user.role === 'Admin' ? null : req.user.id);

    if (contentChanged) {
      await queueService.enqueueAiJob(req.tenantId, note._id, note.content);
    }

    await cacheService.invalidateNote(req.tenantId, req.params.id);
    await cacheService.invalidateNoteList(req.tenantId);

    res.status(200).json({ note });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const repo = new NoteRepository(req.tenantId);
    const deleted = await repo.deleteById(req.params.id, req.user.id, req.user.role);
    
    if (!deleted) {
      throw new AppError(404, 'Note not found');
    }

    await cacheService.invalidateNote(req.tenantId, req.params.id);
    await cacheService.invalidateNoteList(req.tenantId);

    res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAiStatus = async (req, res, next) => {
  try {
    const repo = new NoteRepository(req.tenantId);
    const note = await repo.findById(req.params.id, req.user.id, req.user.role);
    
    if (!note) {
      throw new AppError(404, 'Note not found');
    }

    res.status(200).json({ aiStatus: note.aiStatus, aiSummary: note.aiSummary });
  } catch (error) {
    next(error);
  }
};
