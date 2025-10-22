const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Group = require('../models/Group');

// @route   GET /api/transactions/user/balances
// @desc    Compute user's balances across groups and a summary
// @access  Private
router.get('/user/balances', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find groups where user is a member
    const groups = await Group.find({ 'members.user': userId }).select('id name').lean();

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

    // Calculate balances for friend-to-friend transactions (transactions without a group)
    const friendTransactions = await Transaction.find({
      $and: [
        { 
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        },
        {
          $or: [
            { payer: userId },
            { 'participants.user': userId }
          ]
        },
        { status: { $ne: 'cancelled' } }
      ]
    }).lean();

    let friendBalance = 0;
    let friendTotalPaid = 0;
    let friendTotalOwed = 0;

    friendTransactions.forEach(tx => {
      const isPayer = tx.payer.toString() === userId.toString();
      
      if (isPayer) {
        // User paid the full amount
        friendTotalPaid += tx.amount;
      }
      
      // Check if user is also a participant and add their owed amount
      const userParticipant = tx.participants.find(p => p.user.toString() === userId.toString());
      if (userParticipant) {
        friendTotalOwed += userParticipant.amount;
      }
    });

    friendBalance = friendTotalPaid - friendTotalOwed;

    // Summarize across groups and friend transactions
    let netBalance = 0;
    let totalOwedToMe = 0;
    let totalIOwe = 0;

    // Add group balances to the totals
    for (const gb of groupBalances) {
      netBalance += gb.balance;
      if (gb.balance > 0) totalOwedToMe += gb.balance;
      else totalIOwe += Math.abs(gb.balance);
    }

    // Add friend transaction amounts to the totals
    netBalance += friendBalance;
    if (friendBalance > 0) {
      totalOwedToMe += friendBalance;
    } else {
      totalIOwe += Math.abs(friendBalance);
    }

    // Add friend transactions as a separate "group" for detailed view
    const allBalances = [...groupBalances];
    if (friendTransactions.length > 0) {
      allBalances.push({
        groupId: 'friends',
        groupName: 'Friends',
        balance: friendBalance,
        totalPaid: friendTotalPaid,
        totalOwed: friendTotalOwed
      });
    }

    const result = {
      summary: { totalOwedToMe, totalIOwe, netBalance },
      groupBalances: allBalances
    };
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error computing user balances:', error);
    return res.status(500).json({ success: false, message: 'Server error computing balances' });
  }
});

// @route   GET /api/transactions/user/:userId
// @desc    List transactions for a user
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    const transactions = await Transaction.find({
      $or: [
        { payer: userId },
        { 'participants.user': userId }
      ]
    })
      .populate('payer', 'id name email')
      .populate('participants.user', 'id name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('API Service Error fetching user transactions:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
});

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
    const payload = { ...req.body };
    // Ensure createdBy is set
    payload.createdBy = req.user._id;

    // Only include group field if it's provided and valid
    if (!payload.group || !require('mongoose').Types.ObjectId.isValid(payload.group)) {
      delete payload.group;
    }

    const tx = await Transaction.create(payload);
    // Populate payer and participants.user so frontend consumers receive the expected shape
    const populatedTx = await Transaction.findById(tx._id)
      .populate('payer', 'id name email')
      .populate('participants.user', 'id name email')
      .lean();

    // Update group's totals asynchronously (best-effort)
    try {
        if (tx.group) { // <-- check that group is truthy
          const group = await Group.findById(tx.group);
          if (group) await group.updateTotals();
        }
      } catch (err) {
        console.warn('Failed to update group totals after creating transaction', err.message);
      }

  return res.status(201).json({ success: true, data: populatedTx });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(400).json({ success: false, message: error.message || 'Invalid transaction data' });
  }
});

// @route   GET /api/transactions/friend/:friendId/balance
// @desc    Get running balance with a specific friend
// @access  Private
router.get('/friend/:friendId/balance', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.friendId;
    
    // Simplified approach: Get ALL transactions involving both users
    const allTransactions = await Transaction.find({
      $and: [
        {
          $or: [
            { payer: userId },
            { payer: friendId },
            { 'participants.user': userId },
            { 'participants.user': friendId }
          ]
        },
        {
          $or: [
            { group: { $exists: false } },
            { group: null }
          ]
        }
      ]
    }).populate('payer', 'name email').populate('participants.user', 'name email');

    // Filter to only transactions that involve BOTH users
    const friendTransactions = allTransactions.filter(tx => {
      const payerIsUser = tx.payer._id.toString() === userId.toString();
      const payerIsFriend = tx.payer._id.toString() === friendId.toString();
      const userInParticipants = tx.participants.some(p => p.user._id.toString() === userId.toString());
      const friendInParticipants = tx.participants.some(p => p.user._id.toString() === friendId.toString());
      
      // Transaction must involve both users somehow
      return (payerIsUser || userInParticipants) && (payerIsFriend || friendInParticipants);
    });

    let balance = 0;
    let totalPaid = 0;
    let totalOwed = 0;

    // Calculate from user's perspective
    friendTransactions.forEach(tx => {
      const userIsPayer = tx.payer._id.toString() === userId.toString();
      
      if (userIsPayer) {
        // User paid the full amount
        totalPaid += tx.amount;
      }
      
      // Find user's participant entry to see what they owe
      const userParticipant = tx.participants.find(p => p.user._id.toString() === userId.toString());
      if (userParticipant) {
        totalOwed += userParticipant.amount || 0;
      }
    });

    balance = totalPaid - totalOwed;

    res.json({
      success: true,
      balance,
      totalPaid,
      totalOwed,
      friendId,
      transactions: friendTransactions.length,
      debug: {
        userId: userId.toString(),
        friendId: friendId.toString(),
        allTransactionsFound: allTransactions.length,
        filteredTransactions: friendTransactions.length
      }
    });
  } catch (error) {
    console.error('Error getting friend balance:', error);
    res.status(500).json({ success: false, message: error.message || 'Error getting friend balance' });
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
    const { userId, paid, paymentMethodId } = req.body; // expecting userId, paid flag, optional paymentMethodId
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    // Attempt to mark the participant as paid first
    await tx.markParticipantPaid(userId || req.user._id, paid !== false);

    // If a payment method id was provided, attempt to record the settlement details
    if (paymentMethodId) {
      try {
        const User = require('../models/User');
        // find the user who is the target/recipient of the payment in this participant context
        const initiatorId = req.user._id;
        const targetId = userId || req.user._id; // for now record as provided target

        // attempt to find payment method details from the target user (if they own it)
        const targetUser = await User.findOne({ _id: targetId, 'paymentMethods._id': paymentMethodId }, { 'paymentMethods.$': 1 });
        let pm = null;
        if (targetUser && targetUser.paymentMethods && targetUser.paymentMethods.length > 0) {
          pm = targetUser.paymentMethods[0];
        } else {
          // fallback: try to retrieve the method from the initiator's account (maybe they used their own)
          const initiator = await User.findOne({ _id: initiatorId, 'paymentMethods._id': paymentMethodId }, { 'paymentMethods.$': 1 });
          if (initiator && initiator.paymentMethods && initiator.paymentMethods.length > 0) pm = initiator.paymentMethods[0];
        }

        if (pm) {
          tx.settlements = tx.settlements || [];
          tx.settlements.push({ initiator: initiatorId, target: targetId, amount: null, paymentMethod: { id: pm._id, type: pm.type, handle: pm.handle } });
          await tx.save();
        }
      } catch (pmErr) {
        console.warn('Failed to record payment method for settlement', pmErr.message || pmErr);
      }
    }
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

module.exports = router;