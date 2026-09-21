const NoteRepository = require('../repositories/note.repository');
const aiService = require('../services/ai.service');

exports.keywordSearch = async (req, res, next) => {
  try {
    const repo = new NoteRepository(req.tenantId);
    const { q, page, limit } = req.query;
    
    const result = await repo.keywordSearch(q, {
      page,
      limit,
      ownerId: req.user.id,
      role: req.user.role
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.semanticSearch = async (req, res, next) => {
  try {
    const repo = new NoteRepository(req.tenantId);
    const { query, limit, minScore } = req.body;
    
    const queryVector = await aiService.generateEmbedding(query);
    const results = await repo.semanticSearch(queryVector, { limit, minScore });

    res.status(200).json({ results, count: results.length });
  } catch (error) {
    next(error);
  }
};
