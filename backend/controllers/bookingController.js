const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const TimeSlot = require('../models/TimeSlot');
const { nanoid } = require('nanoid');
const { generateAndUploadQR } = require('../utils/qrGenerator');
const { generatePayHereHash } = require('../utils/payhere');

// POST /api/seats/lock  — Lock seats for 10 minutes
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

// POST /api/payments/initiate
exports.initiatePayment = async (req, res) => {
  const { timeSlotId, seatIds } = req.body;

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

  // Create pending booking
  const orderId = `ORD-${nanoid(10).toUpperCase()}`;
  const booking = await Booking.create({
    customer: req.user._id,
    timeSlot: slot._id,
    movie: slot.movie._id,
    hall: slot.hall._id,
    branch: slot.branch._id,
    seats: seatDetails,
    totalAmount,
    status: 'pending',
    paymentOrderId: orderId,
    paymentStatus: 'pending',
  });

  // Generate PayHere hash
  const hash = generatePayHereHash(
    process.env.PAYHERE_MERCHANT_ID,
    orderId,
    totalAmount,
    'LKR',
    process.env.PAYHERE_MERCHANT_SECRET
  );

  res.json({
    success: true,
    bookingId: booking._id,
    paymentParams: {
      merchant_id: process.env.PAYHERE_MERCHANT_ID,
      return_url: process.env.PAYHERE_RETURN_URL,
      cancel_url: process.env.PAYHERE_CANCEL_URL,
      notify_url: process.env.PAYHERE_NOTIFY_URL,
      order_id: orderId,
      items: `Cinema Tickets - ${slot.movie.title}`,
      currency: 'LKR',
      amount: totalAmount.toFixed(2),
      first_name: req.user.name.split(' ')[0],
      last_name: req.user.name.split(' ').slice(1).join(' ') || 'N/A',
      email: req.user.email,
      phone: '0771234567',
      address: slot.branch.address,
      city: slot.branch.city,
      country: 'Sri Lanka',
      hash,
      sandbox: process.env.PAYHERE_SANDBOX === 'true',
      checkout_url: process.env.PAYHERE_CHECKOUT_URL,
    },
  });
};

// POST /api/payments/webhook  — PayHere notification (public)
exports.payhereWebhook = async (req, res) => {
  const { verifyPayHereWebhook } = require('../utils/payhere');
  const isValid = verifyPayHereWebhook(req.body, process.env.PAYHERE_MERCHANT_SECRET);

  if (!isValid) {
    console.warn('[PayHere Webhook] Invalid signature received:', req.body);
    return res.status(400).send('Invalid signature');
  }

  const { order_id: orderId, status_code: statusCode } = req.body;
  const booking = await Booking.findOne({ paymentOrderId: orderId });
  if (!booking) return res.status(404).send('Booking not found');

  if (statusCode === '2') {
    // Payment success
    const ticketCode = nanoid(10).toUpperCase();
    const qrCodeUrl = await generateAndUploadQR(ticketCode);

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.ticketCode = ticketCode;
    booking.qrCodeUrl = qrCodeUrl;
    await booking.save();

    // Release seat locks since booking is confirmed
    await SeatLock.deleteMany({ timeSlot: booking.timeSlot, lockedBy: booking.customer });
  } else if (statusCode === '-1') {
    booking.paymentStatus = 'failed';
    booking.status = 'cancelled';
    await booking.save();
    await SeatLock.deleteMany({ timeSlot: booking.timeSlot, lockedBy: booking.customer });
  }

  res.status(200).send('OK');
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

  // Time window: within ±60 minutes of showtime start
  const now = new Date();
  const start = new Date(booking.timeSlot.startTime);
  const diffMinutes = (now - start) / 60000;
  if (diffMinutes < -60 || diffMinutes > 30) {
    return res.status(400).json({
      success: false,
      message: `Ticket not valid at this time. Show starts at ${start.toISOString()}.`,
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
