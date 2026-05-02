const TimeSlot = require('../models/TimeSlot');
const Movie = require('../models/Movie');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');

// GET /api/timeslots?branch=&hall=&date=
exports.getTimeSlots = async (req, res) => {
  const query = { isActive: true };
  if (req.user.role === 'branch_manager') query.branch = req.user.assignedBranch;
  else if (req.query.branch) query.branch = req.query.branch;
  if (req.query.hall) query.hall = req.query.hall;
  if (req.query.date) {
    const d = new Date(req.query.date);
    query.startTime = {
      $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(d).setHours(23, 59, 59, 999)),
    };
  }
  const slots = await TimeSlot.find(query)
    .populate('movie', 'title posterUrl duration')
    .populate('hall', 'name screenType')
    .populate('branch', 'name city')
    .sort({ startTime: 1 });
  res.json({ success: true, count: slots.length, timeSlots: slots });
};

// GET /api/timeslots/:id
exports.getTimeSlotById = async (req, res) => {
  const slot = await TimeSlot.findById(req.params.id)
    .populate('movie').populate('hall').populate('branch', 'name city');
  if (!slot) return res.status(404).json({ success: false, message: 'Time slot not found.' });
  res.json({ success: true, timeSlot: slot });
};

// POST /api/timeslots
exports.createTimeSlot = async (req, res) => {
  const { movie: movieId, hall, branch, startTime, pricing, interventionTime = 0 } = req.body;
  if (req.user.role === 'branch_manager' &&
    req.user.assignedBranch?.toString() !== branch?.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied to this branch.' });
  }
  const movie = await Movie.findById(movieId);
  if (!movie) return res.status(404).json({ success: false, message: 'Movie not found.' });
  const start = new Date(startTime);
  const endTime = new Date(start.getTime() + (movie.duration + 20 + Number(interventionTime)) * 60000);
  const conflict = await TimeSlot.findOne({
    hall, isActive: true,
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: start } }],
  });
  if (conflict) {
    return res.status(409).json({
      success: false,
      message: `Hall already booked from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}.`,
    });
  }
  const slot = await TimeSlot.create({ movie: movieId, hall, branch, startTime: start, endTime, interventionTime, pricing });
  res.status(201).json({ success: true, timeSlot: slot });
};

// PUT /api/timeslots/:id
exports.updateTimeSlot = async (req, res) => {
  const slot = await TimeSlot.findById(req.params.id);
  if (!slot) return res.status(404).json({ success: false, message: 'Time slot not found.' });
  if (req.user.role === 'branch_manager' &&
    req.user.assignedBranch?.toString() !== slot.branch.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const { pricing, isActive, interventionTime } = req.body;
  if (pricing) slot.pricing = pricing;
  if (typeof isActive !== 'undefined') slot.isActive = isActive;
  
  // Re-calculate endTime if interventionTime changes
  if (typeof interventionTime !== 'undefined' && interventionTime !== slot.interventionTime) {
    slot.interventionTime = Number(interventionTime);
    const start = new Date(slot.startTime);
    const movie = await Movie.findById(slot.movie);
    slot.endTime = new Date(start.getTime() + (movie.duration + 20 + slot.interventionTime) * 60000);
  }
  
  await slot.save();
  res.json({ success: true, timeSlot: slot });
};

// DELETE /api/timeslots/:id
exports.deleteTimeSlot = async (req, res) => {
  const slot = await TimeSlot.findById(req.params.id);
  if (!slot) return res.status(404).json({ success: false, message: 'Time slot not found.' });
  if (req.user.role === 'branch_manager' &&
    req.user.assignedBranch?.toString() !== slot.branch.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  const bookingCount = await Booking.countDocuments({
    timeSlot: slot._id, status: { $in: ['confirmed', 'pending'] },
  });
  if (bookingCount > 0) {
    return res.status(400).json({ success: false, message: `Cannot delete: ${bookingCount} active booking(s).` });
  }
  await slot.deleteOne();
  res.json({ success: true, message: 'Time slot deleted.' });
};

// GET /api/timeslots/:id/seats
exports.getSeatAvailability = async (req, res) => {
  const slot = await TimeSlot.findById(req.params.id).populate('hall');
  if (!slot) return res.status(404).json({ success: false, message: 'Time slot not found.' });
  const bookedSeats = await Booking.find({ timeSlot: slot._id, status: { $in: ['confirmed', 'used'] } }).select('seats');
  const bookedSeatIds = new Set(bookedSeats.flatMap((b) => b.seats.map((s) => s.seatId)));
  const lockedSeats = await SeatLock.find({ timeSlot: slot._id });
  const lockedByOthers = new Set(
    lockedSeats.filter((l) => l.lockedBy.toString() !== req.user._id.toString()).map((l) => l.seatId)
  );
  const myHold = new Set(
    lockedSeats.filter((l) => l.lockedBy.toString() === req.user._id.toString()).map((l) => l.seatId)
  );
  const seats = slot.hall.layoutConfig.seats.map((seat) => {
    let status = 'available';
    if (!seat.isActive) status = 'inactive';
    else if (bookedSeatIds.has(seat.seatId)) status = 'booked';
    else if (lockedByOthers.has(seat.seatId)) status = 'locked';
    else if (myHold.has(seat.seatId)) status = 'my_hold';
    const price = seat.isActive ? (slot.pricing[seat.type] || 0) : 0;
    return { ...seat.toObject(), status, price };
  });
  res.json({ success: true, seats, pricing: slot.pricing });
};
