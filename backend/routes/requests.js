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

// all routes below require authentication
router.use(protect);

// post /api/users/requests
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

// get /api/users/requests
router.get('/requests', listFriendRequests);

// post /api/users/requests/:requestid/accept
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

// delete /api/users/requests/:requestid
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
