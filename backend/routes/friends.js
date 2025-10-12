const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { addFriend, getFriends } = require('../controllers/friendController');

router.post('/add-friend', protect, addFriend); // defines endpoint that matches request path
router.get('/friends', protect, getFriends); // 

module.exports = router;
