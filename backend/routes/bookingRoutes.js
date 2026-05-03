const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Seat locks
router.post('/seats/lock', protect, requireRole('customer'), ctrl.lockSeats);
router.delete('/seats/lock', protect, requireRole('customer'), ctrl.releaseSeats);

// Payments
router.post('/payments/process', protect, requireRole('customer'), ctrl.processPayment);

// Bookings
router.get('/bookings/my', protect, requireRole('customer'), ctrl.getMyBookings);
router.put('/bookings/:id/cancel', protect, requireRole('customer'), ctrl.cancelBooking);
router.delete('/bookings/:id', protect, requireRole('customer'), ctrl.deleteBooking);

// Tickets
router.get('/tickets/my', protect, requireRole('customer'), ctrl.getMyTickets);
router.get('/tickets/:code', protect, ctrl.getTicketByCode);
router.post('/tickets/:code/validate', protect, requireRole('hall_employee', 'branch_manager', 'main_manager'), ctrl.validateTicket);

module.exports = router;
