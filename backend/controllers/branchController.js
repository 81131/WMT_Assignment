const Branch = require('../models/Branch');

// GET /api/branches
exports.getBranches = async (req, res) => {
  const query = req.query.includeDeleted === 'true' && req.user.role === 'main_manager'
    ? {}
    : { isDeleted: false };
  const branches = await Branch.find(query).populate('manager', 'name email');
  res.json({ success: true, count: branches.length, branches });
};

// GET /api/branches/:id
exports.getBranchById = async (req, res) => {
  const branch = await Branch.findById(req.params.id).populate('manager', 'name email');
  if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
  res.json({ success: true, branch });
};

// POST /api/branches  (main_manager only)
exports.createBranch = async (req, res) => {
  const { name, address, city, phone, manager } = req.body;
  const branch = await Branch.create({ name, address, city, phone, manager });
  res.status(201).json({ success: true, branch });
};

// PUT /api/branches/:id  (main_manager only)
exports.updateBranch = async (req, res) => {
  const { name, address, city, phone, manager, imageUrl } = req.body;
  const branch = await Branch.findByIdAndUpdate(
    req.params.id,
    { name, address, city, phone, manager, imageUrl },
    { new: true, runValidators: true }
  );
  if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
  res.json({ success: true, branch });
};

// DELETE /api/branches/:id  — Soft delete (main_manager only)
exports.deleteBranch = async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
  if (branch.isDeleted) return res.status(400).json({ success: false, message: 'Branch already deleted.' });

  branch.isDeleted = true;
  branch.deletedAt = new Date();
  await branch.save();

  res.json({ success: true, message: 'Branch soft-deleted. Can be restored within 30 days.' });
};

// POST /api/branches/:id/restore  — Undo soft delete (main_manager, within 30 days)
exports.restoreBranch = async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
  if (!branch.isDeleted) return res.status(400).json({ success: false, message: 'Branch is not deleted.' });

  const daysSinceDelete = (Date.now() - new Date(branch.deletedAt)) / (1000 * 60 * 60 * 24);
  if (daysSinceDelete > 30) {
    return res.status(400).json({ success: false, message: 'Restore window has expired (30 days).' });
  }

  branch.isDeleted = false;
  branch.deletedAt = null;
  await branch.save();

  res.json({ success: true, message: 'Branch restored successfully.', branch });
};
