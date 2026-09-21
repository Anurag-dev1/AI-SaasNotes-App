const User = require('../models/user.model');

exports.findByEmail = async (email, tenantId) => {
  const query = { email };
  if (tenantId) query.tenantId = tenantId;
  return await User.findOne(query).select('+password');
};

exports.findById = async (userId) => {
  return await User.findById(userId);
};

exports.findByTenant = async (tenantId) => {
  return await User.find({ tenantId, status: 'active' });
};

exports.updateRole = async (userId, tenantId, role) => {
  return await User.findOneAndUpdate(
    { _id: userId, tenantId },
    { $set: { role } },
    { new: true, runValidators: true }
  );
};

exports.deactivate = async (userId, tenantId) => {
  return await User.findOneAndUpdate(
    { _id: userId, tenantId },
    { $set: { status: 'inactive' } },
    { new: true }
  );
};

exports.findByVerificationToken = async (token) => {
  return await User.findOne({ verificationToken: token });
};

exports.updateRefreshTokenFamily = async (userId, familyId) => {
  return await User.findByIdAndUpdate(userId, {
    $set: { refreshTokenFamily: familyId }
  }, { new: true });
};
