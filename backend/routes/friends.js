const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// friend request endpoints
router.post('/requests', protect, friendController.sendRequest);
router.get('/requests', protect, friendController.listRequests);
router.post('/requests/:requestId/accept', protect, friendController.acceptRequest);
router.delete('/requests/:requestId', protect, friendController.declineRequest);

// legacy/utility endpoints
router.post('/add-friend', protect, friendController.addFriend);
router.get('/friends', protect, friendController.getFriends);
// remove friend (unfriend) - mutual removal
router.delete('/friends/:friendId', protect, friendController.removeFriend);
// debug endpoint to inspect authenticated user and friends (dev only)
// get a friend's public payment methods
// get a friend's public payment methods
router.get('/:friendId/payment-methods', protect, friendController.getFriendPaymentMethods);

module.exports = router;
