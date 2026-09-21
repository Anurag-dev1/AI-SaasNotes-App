const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { csrfProtection } = require('../middleware/csrf');
const { authRateLimit } = require('../middleware/rate-limit');
const { 
  registerSchema, loginSchema, verifyEmailSchema, 
  forgotPasswordSchema, resetPasswordSchema, inviteSchema 
} = require('../schemas/auth.schema');

router.post('/register', authRateLimit, validate(registerSchema), authController.register);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/login', authRateLimit, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/invite', authenticate, requireRole('Admin'), csrfProtection, validate(inviteSchema), authController.invite);

module.exports = router;
