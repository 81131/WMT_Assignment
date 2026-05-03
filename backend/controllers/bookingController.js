const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const TimeSlot = require('../models/TimeSlot');
const { nanoid } = require('nanoid');
const { generateAndUploadQR } = require('../utils/qrGenerator');
exports.lockSeats = async (req, res) => {
  const { timeSlotId, seatIds } = req.body;
  if (!timeSlotId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ success: false, message: 'timeSlotId and seatIds[] are required.' });
  }

  // Verify no seat is already booked or locked by someone else
  const alreadyBooked = await Booking.find({
    timeSlot: timeSlotId,
    status: { $in: ['confirmed', 'used'] },
    'seats.seatId': { $in: seatIds },
  });
  if (alreadyBooked.length > 0) {
    return res.status(409).json({ success: false, message: 'One or more seats are already booked.' });
  }

  const alreadyLocked = await SeatLock.find({
    timeSlot: timeSlotId,
    seatId: { $in: seatIds },
    lockedBy: { $ne: req.user._id },
  });
  if (alreadyLocked.length > 0) {
    const ids = alreadyLocked.map((l) => l.seatId).join(', ');
    return res.status(409).json({ success: false, message: `Seats ${ids} are temporarily held by another user.` });
  }

  // Remove any existing locks by this user for these seats (refresh hold)
  await SeatLock.deleteMany({ timeSlot: timeSlotId, lockedBy: req.user._id });

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const locks = seatIds.map((seatId) => ({ timeSlot: timeSlotId, seatId, lockedBy: req.user._id, expiresAt }));
  await SeatLock.insertMany(locks);

  res.status(201).json({ success: true, message: 'Seats locked for 10 minutes.', expiresAt });
};

// DELETE /api/seats/lock  — Release locks manually
exports.releaseSeats = async (req, res) => {
  const { timeSlotId } = req.body;
  await SeatLock.deleteMany({ timeSlot: timeSlotId, lockedBy: req.user._id });
  res.json({ success: true, message: 'Seat locks released.' });
};

// POST /api/payments/process
exports.processPayment = async (req, res) => {
  const { timeSlotId, seatIds, cardNumber, nameOnCard, expiryDate, cvv } = req.body;

  if (!timeSlotId || !seatIds || !cardNumber || !nameOnCard || !expiryDate || !cvv) {
    return res.status(400).json({ success: false, message: 'All payment fields are required.' });
  }

  const slot = await TimeSlot.findById(timeSlotId).populate('movie hall branch');
  if (!slot) return res.status(404).json({ success: false, message: 'Time slot not found.' });

  // Validate all requested seats are locked by this user
  const userLocks = await SeatLock.find({ timeSlot: timeSlotId, lockedBy: req.user._id });
  const lockedIds = new Set(userLocks.map((l) => l.seatId));
  const unlocked = seatIds.filter((id) => !lockedIds.has(id));
  if (unlocked.length > 0) {
    return res.status(400).json({ success: false, message: `Seats ${unlocked.join(', ')} are not locked by you.` });
  }

  // Build seat details + compute total
  const seatDetails = seatIds.map((seatId) => {
    const seat = slot.hall.layoutConfig.seats.find((s) => s.seatId === seatId);
    const price = slot.pricing[seat.type] || 0;
    return { seatId, seatType: seat.type, price };
  });
  const totalAmount = seatDetails.reduce((sum, s) => sum + s.price, 0);

  // Validate Dummy Card
  const cleanCard = cardNumber.replace(/\s/g, '');
  const successCards = ['4916217501611292', '5307732125531191', '346781005510225'];
  const errorCards = {
    '4024007194349121': 'Insufficient Funds',
    '5459051433777487': 'Insufficient Funds',
    '370787711978928': 'Insufficient Funds',
    '4929119799365646': 'Limit Exceeded',
    '5491182243178283': 'Limit Exceeded',
    '340701811823469': 'Limit Exceeded',
    '4929768900837248': 'Do Not Honor',
    '5388172137367973': 'Do Not Honor',
    '374664175202812': 'Do Not Honor',
    '4024007120869333': 'Network Error',
    '5237980565185003': 'Network Error',
    '373433500205887': 'Network Error',
  };

  if (errorCards[cleanCard]) {
    return res.status(400).json({ success: false, message: `Payment Declined: ${errorCards[cleanCard]}` });
  }

  if (!successCards.includes(cleanCard)) {
    return res.status(400).json({ success: false, message: 'Payment Declined: Invalid Card Number' });
  }

  // Payment Success - Create booking
  const orderId = `ORD-${nanoid(10).toUpperCase()}`;
  const ticketCode = nanoid(10).toUpperCase();
  const qrCodeUrl = await generateAndUploadQR(ticketCode);

  const booking = await Booking.create({
    customer: req.user._id,
    timeSlot: slot._id,
    movie: slot.movie._id,
    hall: slot.hall._id,
    branch: slot.branch._id,
    seats: seatDetails,
    totalAmount,
    status: 'confirmed',
    paymentOrderId: orderId,
    paymentStatus: 'paid',
    ticketCode,
    qrCodeUrl
  });

  // Release seat locks
  await SeatLock.deleteMany({ timeSlot: slot._id, lockedBy: req.user._id });

  res.json({
    success: true,
    message: 'Payment Successful',
    bookingId: booking._id,
    ticketCode
  });
};

// GET /api/tickets/my  — Customer's tickets
exports.getMyTickets = async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id })
    .populate('movie', 'title posterUrl')
    .populate('hall', 'name')
    .populate('branch', 'name city')
    .populate('timeSlot', 'startTime endTime')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: bookings.length, tickets: bookings });
};

// GET /api/tickets/:code  — Get ticket by code
exports.getTicketByCode = async (req, res) => {
  const booking = await Booking.findOne({ ticketCode: req.params.code })
    .populate('movie', 'title posterUrl duration')
    .populate('hall', 'name screenType')
    .populate('branch', 'name city address')
    .populate('timeSlot', 'startTime endTime')
    .populate('customer', 'name email');
  if (!booking) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  res.json({ success: true, ticket: booking });
};

// POST /api/tickets/:code/validate  — Hall employee scans ticket
exports.validateTicket = async (req, res) => {
  const booking = await Booking.findOne({ ticketCode: req.params.code })
    .populate('timeSlot').populate('hall').populate('movie');
  if (!booking) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  if (booking.status !== 'confirmed') {
    return res.status(400).json({ success: false, message: `Ticket status is '${booking.status}'. Must be 'confirmed'.` });
  }

  // Check employee is assigned to this hall or is a manager
  const user = req.user;
  if (user.role === 'hall_employee') {
    if (!user.assignedHalls?.map(String).includes(booking.hall._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this hall.' });
    }
  } else if (user.role === 'branch_manager') {
    if (user.assignedBranch?.toString() !== booking.branch.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this branch.' });
    }
  }

  // Time window: 60 min before showtime up to 120 min after (covers entry + movie duration grace)
  const now = new Date();
  const start = new Date(booking.timeSlot.startTime);
  const diffMinutes = (now - start) / 60000; // positive = after showtime, negative = before
  if (diffMinutes < -60 || diffMinutes > 120) {
    const localTime = start.toLocaleString('en-US', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo'
    });
    const windowOpen  = new Date(start.getTime() - 60 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
    const windowClose = new Date(start.getTime() + 120 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
    return res.status(400).json({
      success: false,
      message: `Ticket is only valid between ${windowOpen} and ${windowClose} (show starts at ${localTime}).`,
    });
  }

  booking.status = 'used';
  booking.usedAt = now;
  booking.scannedBy = user._id;
  await booking.save();

  res.json({ success: true, message: 'Ticket validated. Welcome!', ticket: booking });
};

// GET /api/bookings/my
exports.getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id })
    .populate('movie', 'title posterUrl').populate('hall', 'name')
    .populate('branch', 'name').populate('timeSlot', 'startTime endTime')
    .sort({ createdAt: -1 });
  res.json({ success: true, bookings });
};

// PUT /api/bookings/:id/cancel
exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ success: false, message: 'Cannot cancel this booking.' });
  }
  booking.status = 'cancelled';
  booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : booking.paymentStatus;
  await booking.save();
  res.json({ success: true, message: 'Booking cancelled.' });
};

// DELETE /api/bookings/:id
exports.deleteBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (booking.status === 'used') {
    return res.status(400).json({ success: false, message: 'Cannot delete a ticket that has already been used.' });
  }
  await booking.deleteOne();
  res.json({ success: true, message: 'Booking deleted permanently. No refund is possible.' });
};
