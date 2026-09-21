const { z } = require('zod');

const keywordSearchSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const semanticSearchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minScore: z.coerce.number().min(0).max(1).default(0.72)
});

module.exports = {
  keywordSearchSchema,
  semanticSearchSchema
};
