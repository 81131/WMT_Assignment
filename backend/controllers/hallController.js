const Hall = require('../models/Hall');

// Build seat grid from rows/cols config
const buildDefaultLayout = (rows, cols) => {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowLetter = String.fromCharCode(65 + r); // A, B, C...
      seats.push({
        seatId: `${rowLetter}${c + 1}`,
        type: 'regular',
        row: r,
        col: c,
        isActive: true,
      });
    }
  }
  return seats;
};

// GET /api/halls?branch=<branchId>
exports.getHalls = async (req, res) => {
  const query = {};
  if (req.query.branch) query.branch = req.query.branch;
  // Branch managers see only their branch
  if (req.user.role === 'branch_manager') {
    query.branch = req.user.assignedBranch;
  }
  const halls = await Hall.find(query).populate('branch', 'name city');
  res.json({ success: true, count: halls.length, halls });
};

// GET /api/halls/:id
exports.getHallById = async (req, res) => {
  const hall = await Hall.findById(req.params.id).populate('branch', 'name city');
  if (!hall) return res.status(404).json({ success: false, message: 'Hall not found.' });
  res.json({ success: true, hall });
};

// POST /api/halls
exports.createHall = async (req, res) => {
  const { branch, name, screenType, rows, cols, seats } = req.body;

  // Branch manager can only create in their own branch
  if (req.user.role === 'branch_manager' &&
    req.user.assignedBranch?.toString() !== branch?.toString()) {
    return res.status(403).json({ success: false, message: 'You can only create halls in your assigned branch.' });
  }

  const layoutSeats = seats || buildDefaultLayout(rows || 8, cols || 12);
  const hall = await Hall.create({
    branch,
    name,
    screenType: screenType || '2D',
    layoutConfig: { rows: rows || 8, cols: cols || 12, seats: layoutSeats },
  });

  res.status(201).json({ success: true, hall });
};

// PUT /api/halls/:id  — Update layout (branch_manager for own branch, main_manager for any)
exports.updateHall = async (req, res) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) return res.status(404).json({ success: false, message: 'Hall not found.' });

  if (req.user.role === 'branch_manager' &&
    req.user.assignedBranch?.toString() !== hall.branch.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied to this hall.' });
  }

  const { name, screenType, rows, cols, seats } = req.body;
  if (name) hall.name = name;
  if (screenType) hall.screenType = screenType;
  if (seats) {
    hall.layoutConfig.seats = seats;
    if (rows) hall.layoutConfig.rows = rows;
    if (cols) hall.layoutConfig.cols = cols;
  }

  await hall.save();
  res.json({ success: true, hall });
};

// DELETE /api/halls/:id  (main_manager only)
exports.deleteHall = async (req, res) => {
  const hall = await Hall.findByIdAndDelete(req.params.id);
  if (!hall) return res.status(404).json({ success: false, message: 'Hall not found.' });
  res.json({ success: true, message: 'Hall deleted successfully.' });
};
