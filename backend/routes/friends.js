const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// Friend request endpoints
router.post('/requests', protect, friendController.sendRequest);
router.get('/requests', protect, friendController.listRequests);
router.post('/requests/:requestId/accept', protect, friendController.acceptRequest);
router.delete('/requests/:requestId', protect, friendController.declineRequest);

// Legacy/utility endpoints
router.post('/add-friend', protect, friendController.addFriend);
router.get('/friends', protect, friendController.getFriends);
// Remove friend (unfriend) - mutual removal
router.delete('/friends/:friendId', protect, friendController.removeFriend);
// Debug endpoint to inspect authenticated user and friends (dev only)
router.get('/debug', protect, friendController.debugUser);

module.exports = router;
