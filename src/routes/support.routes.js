const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { 
    createTicket, 
    getMyTickets, 
    getTicket, 
    addTicketResponse 
} = require('../controllers/support.controller');

const router = express.Router();

router.use(protect);

router.post('/', createTicket);
router.get('/me', getMyTickets);
router.get('/:id', getTicket);
router.put('/:id/response', addTicketResponse);

module.exports = router;
