const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { addFriend, getFriends } = require('../controllers/friendController');

router.post('/add-friend', protect, addFriend);
router.get('/friends', protect, getFriends); // <--- this returns your friends

module.exports = router;
