const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  aiSummary: {
    type: String,
    default: null
  },
  aiStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: null
  },
  embedding: {
    type: [Number],
    select: false
  },
  jobId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

noteSchema.index({ tenantId: 1, createdAt: -1 });
noteSchema.index({ tenantId: 1, ownerId: 1, createdAt: -1 });
noteSchema.index({ title: 'text', content: 'text' });

function ensureTenantId(next) {
  const filter = this.getFilter();
  if (!filter.tenantId) {
    return next(new Error('Query missing tenantId filter — potential cross-tenant data leak'));
  }
  next();
}

noteSchema.pre('find', ensureTenantId);
noteSchema.pre('findOne', ensureTenantId);

noteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Note', noteSchema);
