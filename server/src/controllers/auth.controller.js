const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../middleware/error-handler');
const Tenant = require('../models/tenant.model');
const User = require('../models/user.model');
const PasswordResetToken = require('../models/password-reset-token.model');
const { blocklistClient } = require('../config/redis');
const emailService = require('../services/email.service');
const userRepository = require('../repositories/user.repository');

const generateTokens = (user) => {
  const jti = uuidv4();
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role, tenantId: user.tenantId },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', jwtid: jti }
  );

  const familyId = user.refreshTokenFamily || uuidv4();
  const refreshToken = jwt.sign(
    { id: user._id, tenantId: user.tenantId, familyId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken, familyId };
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, tenantName } = req.body;
    const slug = tenantName.toLowerCase().replace(/\s+/g, '-');
    
    // Check if user already exists
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      const existingUser = await User.findOne({ email, tenantId: existingTenant._id });
      if (existingUser) {
        return res.status(200).json({ message: 'If this email is not already registered, a verification email has been sent.' });
      }
    }

    const tenant = new Tenant({ name: tenantName, slug });
    await tenant.save();

    const verificationToken = uuidv4();
    const user = new User({
      email,
      password,
      name,
      role: 'Admin',
      tenantId: tenant._id,
      emailVerified: false,
      verificationToken
    });
    await user.save();

    await emailService.sendVerificationEmail(email, verificationToken, name);

    res.status(200).json({ message: 'If this email is not already registered, a verification email has been sent.' });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await userRepository.findByVerificationToken(token);
    
    if (!user) {
      throw new AppError(400, 'Invalid verification token');
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // For simplicity, finding first active user matching email (in real multi-tenant app, might need tenant context)
    const user = await User.findOne({ email, status: 'active' }).select('+password');
    
    if (!user || !(await bcryptjs.compare(password, user.password))) {
      throw new AppError(401, 'Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new AppError(403, 'Please verify your email first');
    }

    const { accessToken, refreshToken, familyId } = generateTokens(user);
    
    await userRepository.updateRefreshTokenFamily(user._id, familyId);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) throw new AppError(401, 'Refresh token missing');

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active' || !user.emailVerified) {
      throw new AppError(401, 'Invalid session');
    }

    // Replay attack detection
    if (user.refreshTokenFamily !== decoded.familyId) {
      await userRepository.updateRefreshTokenFamily(user._id, null);
      throw new AppError(401, 'Session compromised. Please login again.');
    }

    const tokens = generateTokens(user);
    await userRepository.updateRefreshTokenFamily(user._id, tokens.familyId);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ 
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { jti, exp } = req.user;
    if (jti && exp) {
      const ttl = exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await blocklistClient.setex(`blocklist:${jti}`, ttl, 'true');
      }
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (user) {
      const resetToken = uuidv4();
      const hash = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      await PasswordResetToken.create({
        userId: user._id,
        token: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
    }

    res.status(200).json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const resetDoc = await PasswordResetToken.findOne({
      token: hash,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetDoc) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const user = await User.findById(resetDoc.userId);
    user.password = newPassword;
    user.refreshTokenFamily = undefined; // Invalidate sessions
    await user.save();

    resetDoc.used = true;
    await resetDoc.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

exports.invite = async (req, res, next) => {
  try {
    const { email, name, role } = req.body;
    const tenantId = req.tenantId;

    const tenant = await Tenant.findById(tenantId);
    
    const existingUser = await User.findOne({ email, tenantId });
    if (existingUser) {
      throw new AppError(400, 'User already in workspace');
    }

    const verificationToken = uuidv4();
    // Use a random robust password string for invitees (they reset it on verify)
    const tempPassword = crypto.randomBytes(16).toString('hex') + "A1!"; 
    const user = new User({
      email,
      name,
      role,
      tenantId,
      password: tempPassword,
      emailVerified: false,
      verificationToken
    });
    
    await user.save();
    await emailService.sendInviteEmail(email, tenant.name, verificationToken, name);

    res.status(201).json({
      message: 'Invitation sent',
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    next(error);
  }
};
