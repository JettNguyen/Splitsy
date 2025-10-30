const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const friendController = require('../controllers/friendController');

// friend request endpoints
router.post('/requests', protect, friendController.sendRequest);
router.get('/requests', protect, friendController.listRequests);
router.post('/requests/:requestId/accept', protect, friendController.acceptRequest);
router.delete('/requests/:requestId', protect, friendController.declineRequest);

// utility endpoints
router.post('/add-friend', protect, friendController.addFriend);
router.get('/friends', protect, friendController.getFriends);
// unfriend (mutual removal)
router.delete('/friends/:friendId', protect, friendController.removeFriend);
// router.get('/debug', protect, friendController.debugUser);

module.exports = router;
