const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { csrfProtection } = require('../middleware/csrf');
const { aiRateLimit } = require('../middleware/rate-limit');
const { keywordSearchSchema, semanticSearchSchema } = require('../schemas/search.schema');

router.get('/', authenticate, validate(keywordSearchSchema, 'query'), searchController.keywordSearch);
router.post('/semantic', authenticate, aiRateLimit, csrfProtection, validate(semanticSearchSchema), searchController.semanticSearch);

module.exports = router;
