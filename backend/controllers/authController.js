const User = require('../models/User');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  const user = await User.create({ name, email, passwordHash: password, role: 'customer' });
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  await User.updateOne({ _id: user._id }, { refreshToken });

  res.status(201).json({ success: true, accessToken, refreshToken, user });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  await User.updateOne({ _id: user._id }, { refreshToken });

  res.json({ success: true, accessToken, refreshToken, user });
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }

  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token mismatch.' });
  }

  const newAccessToken = signAccessToken(user._id);
  const newRefreshToken = signRefreshToken(user._id);

  await User.updateOne({ _id: user._id }, { refreshToken: newRefreshToken });

  res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    await User.updateOne({ _id: user._id }, { refreshToken: null });
  }
  res.json({ success: true, message: 'Logged out successfully.' });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// POST /api/auth/users  (main_manager only — create staff accounts)
exports.createStaff = async (req, res) => {
  const { name, email, password, role, assignedBranch, assignedHalls } = req.body;
  const allowedRoles = ['branch_manager', 'hall_employee', 'customer'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
    assignedBranch: assignedBranch || null,
    assignedHalls: assignedHalls || [],
  });

  res.status(201).json({ success: true, user });
};

// GET /api/auth/users  (main_manager only)
exports.getAllUsers = async (req, res) => {
  const users = await User.find().select('-passwordHash -refreshToken').populate('assignedBranch', 'name city').populate('assignedHalls', 'name');
  res.json({ success: true, count: users.length, users });
};

// PUT /api/auth/users/:id  (main_manager only)
exports.updateUser = async (req, res) => {
  const { name, role, assignedBranch, assignedHalls, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, role, assignedBranch, assignedHalls, isActive },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshToken');

  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, user });
};
