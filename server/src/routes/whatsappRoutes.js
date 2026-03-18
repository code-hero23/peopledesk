const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/whatsappController');

// Meta requires a GET request for verification
router.get('/webhook', verifyWebhook);

// Meta sends POST requests for events (messages, statuses)
router.post('/webhook', handleWebhook);

module.exports = router;
