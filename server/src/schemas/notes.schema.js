const { z } = require('zod');

const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(16384),
  tags: z.array(z.string().max(50)).max(10).optional().default([])
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(16384).optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
});

const noteParamsSchema = z.object({
  id: z.string().length(24)
});

const listNotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tag: z.string().optional()
});

module.exports = {
  createNoteSchema,
  updateNoteSchema,
  noteParamsSchema,
  listNotesQuerySchema
};
