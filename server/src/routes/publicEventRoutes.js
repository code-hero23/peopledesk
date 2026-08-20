const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEventById,
    submitRegistration,
    exportEventResponses
} = require('../controllers/publicEventController');

// All routes are public (No login required)
router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:identifier', getEventById);
router.post('/:identifier/register', submitRegistration);
router.get('/:identifier/export', exportEventResponses);

module.exports = router;
