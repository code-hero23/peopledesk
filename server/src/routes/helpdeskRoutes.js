const express = require('express');
const router = express.Router();
const { createTicket, getTickets, updateTicketStatus, deleteTicket } = require('../controllers/helpdeskController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/', protect, createTicket);
router.get('/', protect, getTickets);
router.put('/:id/status', protect, updateTicketStatus);
router.delete('/:id', protect, authorize('ADMIN'), deleteTicket);

module.exports = router;
