const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

router.get('/', healthController.liveness);
router.get('/detail', healthController.detail);

module.exports = router;
