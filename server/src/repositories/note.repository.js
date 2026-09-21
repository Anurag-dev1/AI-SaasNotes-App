const mongoose = require('mongoose');
const { AppError } = require('../middleware/error-handler');

class NoteRepository {
  constructor(tenantId) {
    this.tenantId = tenantId;
  }

  async create(data) {
    const Note = require('../models/note.model');
    const note = new Note({ ...data, tenantId: this.tenantId });
    return await note.save();
  }

  async findById(noteId, ownerId = null, role = 'Member') {
    const Note = require('../models/note.model');
    const query = { _id: noteId, tenantId: this.tenantId };
    if (role === 'Member' && ownerId) {
      query.ownerId = ownerId;
    }
    return await Note.findOne(query);
  }

  async findAll({ page = 1, limit = 10, tag, ownerId, role }) {
    const Note = require('../models/note.model');
    const query = { tenantId: this.tenantId };
    
    if (role === 'Member' && ownerId) {
      query.ownerId = ownerId;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (tag) {
      query.tags = tag;
    }

    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Note.countDocuments(query)
    ]);

    return {
      notes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async updateById(noteId, data, ownerId) {
    const Note = require('../models/note.model');
    const query = { _id: noteId, tenantId: this.tenantId };
    if (ownerId) {
      query.ownerId = ownerId;
    }
    
    return await Note.findOneAndUpdate(query, { $set: data }, { new: true });
  }

  async deleteById(noteId, ownerId = null, role = 'Admin') {
    const Note = require('../models/note.model');
    const query = { _id: noteId, tenantId: this.tenantId };
    
    if (role !== 'Admin' && ownerId) {
      query.ownerId = ownerId;
    }
    
    const result = await Note.deleteOne(query);
    return result.deletedCount > 0;
  }

  async updateAiResult(noteId, { aiSummary, aiStatus, embedding }) {
    const Note = require('../models/note.model');
    const query = { _id: noteId, tenantId: this.tenantId };
    return await Note.findOneAndUpdate(query, { $set: { aiSummary, aiStatus, embedding } }, { new: true });
  }

  async keywordSearch(searchQuery, { page = 1, limit = 10, ownerId, role }) {
    const Note = require('../models/note.model');
    const query = {
      tenantId: this.tenantId,
      $text: { $search: searchQuery }
    };

    if (role === 'Member' && ownerId) {
      query.ownerId = ownerId;
    }

    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(Number(limit)),
      Note.countDocuments(query)
    ]);

    return {
      results: notes,
      count: total
    };
  }

  async semanticSearch(queryVector, { limit = 10, minScore = 0.40 } = {}) {
    const Note = require('../models/note.model');
    const mongoose = require('mongoose');
    const tenantObjectId = new mongoose.Types.ObjectId(this.tenantId);
    
    // Fallback: Perform local cosine similarity calculation
    // Standard local MongoDB Community Edition does not support $vectorSearch (requires Atlas).
    const notes = await Note.find({ tenantId: tenantObjectId, embedding: { $exists: true, $type: 'array', $ne: [] } })
      .select('title content aiSummary createdAt embedding')
      .lean();
      
    function cosineSimilarity(vecA, vecB) {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let dotProduct = 0, normA = 0, normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    const results = notes.map(note => {
      const score = cosineSimilarity(queryVector, note.embedding);
      return {
        _id: note._id,
        title: note.title,
        snippet: (note.content || '').substring(0, 200),
        aiSummary: note.aiSummary,
        createdAt: note.createdAt,
        score
      };
    })
    .filter(n => n.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
    
    return results;
  }
}

module.exports = NoteRepository;
