const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required roles: ${roles.join(', ')}.`,
    });
  }
  next();
};

/**
 * Scopes branch_manager to their assigned branch.
 * Checks req.params.branchId or req.body.branch against user.assignedBranch.
 * main_manager bypasses this check.
 */
exports.branchScope = (req, res, next) => {
  if (req.user.role === 'main_manager') return next();
  if (req.user.role !== 'branch_manager') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const requestedBranch =
    req.params.branchId ||
    req.body.branch ||
    req.query.branch;

  if (!requestedBranch) return next(); // listing routes — filter applied in controller

  if (req.user.assignedBranch?.toString() !== requestedBranch.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only manage your assigned branch.',
    });
  }
  next();
};
