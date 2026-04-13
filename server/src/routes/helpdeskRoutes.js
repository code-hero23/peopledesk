const express = require('express');
const router = express.Router();
const { createTicket, getTickets, updateTicketStatus } = require('../controllers/helpdeskController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, createTicket);
router.get('/', protect, getTickets);
router.put('/:id/status', protect, updateTicketStatus);

module.exports = router;
