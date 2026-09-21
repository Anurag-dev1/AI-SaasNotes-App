const { z } = require('zod');

const updateRoleSchema = z.object({
  role: z.enum(['Admin', 'Member'])
});

const memberParamsSchema = z.object({
  userId: z.string().length(24)
});

module.exports = {
  updateRoleSchema,
  memberParamsSchema
};
