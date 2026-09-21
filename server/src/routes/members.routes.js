const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { csrfProtection } = require('../middleware/csrf');
const { apiRateLimit } = require('../middleware/rate-limit');
const { updateRoleSchema, memberParamsSchema } = require('../schemas/members.schema');

router.get('/', authenticate, requireRole('Admin'), apiRateLimit, membersController.list);
router.delete('/:userId', authenticate, requireRole('Admin'), apiRateLimit, csrfProtection, validate(memberParamsSchema, 'params'), membersController.remove);
router.patch('/:userId/role', authenticate, requireRole('Admin'), apiRateLimit, csrfProtection, validate(memberParamsSchema, 'params'), validate(updateRoleSchema), membersController.updateRole);

module.exports = router;
