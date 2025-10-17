const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Group = require('../models/Group');

// @route   GET /api/transactions/group/:groupId
// @desc    List transactions for a group
// @access  Private
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const { groupId } = req.params;

    const transactions = await Transaction.find({ group: groupId })
      .populate('payer', 'id name email')
      .populate('participants.user', 'id name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching group transactions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
});

// @route   POST /api/transactions
// @desc    Create a transaction
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const payload = req.body;
    // payload will be validated by the Transaction model
    // Ensure createdBy is set
    payload.createdBy = req.user._id;

    const tx = await Transaction.create(payload);

    // Update group's totals asynchronously (best-effort)
    try {
        if (tx.group) { // <-- check that group is truthy
          const group = await Group.findById(tx.group);
          if (group) await group.updateTotals();
        }
      } catch (err) {
        console.warn('Failed to update group totals after creating transaction', err.message);
      }

    return res.status(201).json({ success: true, data: tx });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(400).json({ success: false, message: error.message || 'Invalid transaction data' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get transaction by id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
      .populate('payer', 'id name email')
      .populate('participants.user', 'id name email');

    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    return res.json({ success: true, data: tx });
  } catch (error) {
    console.error('Error retrieving transaction:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    return res.json({ success: true, data: tx });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(400).json({ success: false, message: error.message || 'Invalid data' });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/transactions/:id/settle
// @desc    Mark transaction/participant as settled (simple wrapper)
// @access  Private
router.post('/:id/settle', protect, async (req, res) => {
  try {
    const { userId, paid } = req.body; // expecting userId & paid flag
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    await tx.markParticipantPaid(userId || req.user._id, paid !== false);
    // update group totals
    try {
      const group = await Group.findById(tx.group);
      if (group) await group.updateTotals();
    } catch (err) {
      console.warn('Failed to update group totals after settle', err.message);
    }

    return res.json({ success: true, message: 'Transaction updated/settled' });
  } catch (error) {
    console.error('Error settling transaction:', error);
    return res.status(400).json({ success: false, message: error.message || 'Error settling transaction' });
  }
});

// @route   GET /api/transactions/user/balances
// @desc    Compute user's balances across groups and a summary
// @access  Private
router.get('/user/balances', protect, async (req, res) => {
  console.log('GET /user/balances called for user:', req.user?._id);
  try {
    const userId = req.user._id;

    // Find groups where user is a member
    const groups = await Group.find({ 'members.user': userId }).select('id name').lean();
    console.log('User groups for balance computation:', groups.map(g => g.name));

    const groupBalances = await Promise.all(groups.map(async (g) => {
      const bal = await Transaction.getUserGroupBalance(userId, g._id || g.id);
      return {
        groupId: g._id || g.id,
        groupName: g.name,
        balance: bal.balance,
        totalPaid: bal.totalPaid,
        totalOwed: bal.totalOwed
      };
    }));

    // Summarize across groups
    let netBalance = 0;
    let totalOwedToMe = 0;
    let totalIOwe = 0;

    for (const gb of groupBalances) {
      netBalance += gb.balance;
      if (gb.balance > 0) totalOwedToMe += gb.balance;
      else totalIOwe += Math.abs(gb.balance);
    }

    return res.json({
      success: true,
      data: {
        summary: { totalOwedToMe, totalIOwe, netBalance },
        groupBalances
      }
    });
  } catch (error) {
    console.error('Error computing user balances:', error);
    return res.status(500).json({ success: false, message: 'Server error computing balances' });
  }
});

module.exports = router;