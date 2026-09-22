const userRepository = require('../repositories/user.repository');
const { blocklistClient } = require('../config/redis');
const { AppError } = require('../middleware/error-handler');

exports.list = async (req, res, next) => {
  try {
    const members = await userRepository.findByTenant(req.tenantId);
    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (req.params.userId === req.user.id) {
      throw new AppError(400, 'Cannot remove yourself');
    }

    const member = await userRepository.deactivate(req.params.userId, req.tenantId);
    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    // Invalidate refresh tokens
    await userRepository.updateRefreshTokenFamily(req.params.userId, null);
    
    // Add a marker in blocklist to forcefully block this user if they use current valid access tokens
    // A robust impl would check this marker in the auth middleware
    await blocklistClient.setex(`user-deactivated:${req.params.userId}`, 15 * 60, 'true');

    res.status(200).json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    if (req.params.userId === req.user.id) {
      throw new AppError(400, 'Cannot change your own role');
    }

    const member = await userRepository.updateRole(req.params.userId, req.tenantId, req.body.role);
    if (!member) {
      throw new AppError(404, 'Member not found');
    }

    // Force role reload on next request by tracking the timestamp of the role change
    // Using minTokenIat approach in auth middleware instead of a blanket ban
    await blocklistClient.setex(`role-changed:${req.params.userId}`, 15 * 60, Date.now().toString()).catch(() => {});

    res.status(200).json({ message: 'Role updated', member });
  } catch (error) {
    next(error);
  }
};
