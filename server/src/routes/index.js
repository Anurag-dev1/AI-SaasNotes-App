const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const notesRoutes = require('./notes.routes');
const searchRoutes = require('./search.routes');
const membersRoutes = require('./members.routes');
const healthRoutes = require('./health.routes');

router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);
router.use('/search', searchRoutes);
router.use('/members', membersRoutes);
router.use('/health', healthRoutes);

module.exports = router;
