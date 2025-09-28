const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Simple transaction routes for testing
// @route   GET /api/transactions/group/:groupId
router.get('/group/:groupId', protect, async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Transactions route working (MongoDB backend)'
  });
});

// @route   POST /api/transactions
router.post('/', protect, async (req, res) => {
  res.json({
    success: true,
    data: { id: 'test123' },
    message: 'Transaction created (test mode)'
  });
});

// @route   GET /api/transactions/:id
router.get('/:id', protect, async (req, res) => {
  res.json({
    success: true,
    data: { id: req.params.id },
    message: 'Transaction retrieved (test mode)'
  });
});

// @route   PUT /api/transactions/:id
router.put('/:id', protect, async (req, res) => {
  res.json({
    success: true,
    data: { id: req.params.id },
    message: 'Transaction updated (test mode)'
  });
});

// @route   DELETE /api/transactions/:id
router.delete('/:id', protect, async (req, res) => {
  res.json({
    success: true,
    message: 'Transaction deleted (test mode)'
  });
});

// @route   POST /api/transactions/:id/settle
router.post('/:id/settle', protect, async (req, res) => {
  res.json({
    success: true,
    message: 'Transaction settled (test mode)'
  });
});

// @route   GET /api/transactions/user/balances
router.get('/user/balances', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      summary: {
        totalOwedToMe: 0,
        totalIOwe: 0,
        netBalance: 0
      },
      groupBalances: []
    },
    message: 'User balances retrieved (test mode)'
  });
});

module.exports = router;