const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notes.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { csrfProtection } = require('../middleware/csrf');
const { apiRateLimit, aiRateLimit } = require('../middleware/rate-limit');
const { 
  createNoteSchema, updateNoteSchema, noteParamsSchema, listNotesQuerySchema 
} = require('../schemas/notes.schema');

router.get('/', authenticate, apiRateLimit, validate(listNotesQuerySchema, 'query'), notesController.list);
router.post('/', authenticate, aiRateLimit, csrfProtection, validate(createNoteSchema), notesController.create);
router.get('/:id', authenticate, apiRateLimit, validate(noteParamsSchema, 'params'), notesController.getById);
router.put('/:id', authenticate, aiRateLimit, csrfProtection, validate(noteParamsSchema, 'params'), validate(updateNoteSchema), notesController.update);
router.delete('/:id', authenticate, apiRateLimit, csrfProtection, validate(noteParamsSchema, 'params'), notesController.remove);
router.get('/:id/ai-status', authenticate, validate(noteParamsSchema, 'params'), notesController.getAiStatus);

module.exports = router;
