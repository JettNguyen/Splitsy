const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  sendFriendRequest,
  listFriendRequests,
  acceptFriendRequest,
  declineFriendRequest
} = require('../controllers/requestsController');

const { protect } = require('../middleware/auth');

// All routes below require authentication
router.use(protect);

// POST /api/users/requests → send a friend request
router.post(
  '/requests',
  [
    body('toId')
      .notEmpty()
      .withMessage('Target user ID is required')
      .isMongoId()
      .withMessage('Invalid user ID'),
    body('message').optional().isString()
  ],
  sendFriendRequest
);

// GET /api/users/requests → list all friend requests
router.get('/requests', listFriendRequests);

// POST /api/users/requests/:requestId/accept → accept a friend request
router.post(
  '/requests/:requestId/accept',
  [
    param('requestId')
      .notEmpty()
      .withMessage('Request ID is required')
      .isMongoId()
      .withMessage('Invalid request ID')
  ],
  acceptFriendRequest
);

// DELETE /api/users/requests/:requestId → decline a friend request
router.delete(
  '/requests/:requestId',
  [
    param('requestId')
      .notEmpty()
      .withMessage('Request ID is required')
      .isMongoId()
      .withMessage('Invalid request ID')
  ],
  declineFriendRequest
);

module.exports = router;
