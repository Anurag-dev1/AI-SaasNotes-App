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
    
    // True MongoDB Atlas $vectorSearch with tenant isolation pre-filter
    const results = await Note.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index', // Requires Atlas Search index to be created
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: limit * 10,
          limit: limit,
          filter: { tenantId: tenantObjectId }
        }
      },
      {
        $project: {
          title: 1,
          content: 1,
          aiSummary: 1,
          createdAt: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          score: { $gte: minScore }
        }
      }
    ]);
    
    return results;
  }
}

module.exports = NoteRepository;
