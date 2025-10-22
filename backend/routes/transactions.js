const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Group = require('../models/Group');

// route:get /api/transactions/user/balances
// description:compute user's balances across groups and a summary
// access:private
router.get('/user/balances', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // find groups where user is a member
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

    // calculate balances for friend-to-friend transactions (transactions without a group)
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
        // user paid the full amount
        friendTotalPaid += tx.amount;
      }
      
      // check if user is also a participant and add their owed amount
      const userParticipant = tx.participants.find(p => p.user.toString() === userId.toString());
      if (userParticipant) {
        friendTotalOwed += userParticipant.amount;
      }
    });

    friendBalance = friendTotalPaid - friendTotalOwed;

    // summarize across groups and friend transactions
    let netBalance = 0;
    let totalOwedToMe = 0;
    let totalIOwe = 0;

    // add group balances to the totals
    for (const gb of groupBalances) {
      netBalance += gb.balance;
      if (gb.balance > 0) totalOwedToMe += gb.balance;
      else totalIOwe += Math.abs(gb.balance);
    }

    // add friend transaction amounts to the totals
    netBalance += friendBalance;
    if (friendBalance > 0) {
      totalOwedToMe += friendBalance;
    } else {
      totalIOwe += Math.abs(friendBalance);
    }

    // add friend transactions as a separate "group" for detailed view
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

// route:get /api/transactions/user/:userid
// description:list transactions for a user
// access:private
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

// route:get /api/transactions/group/:groupid
// description:list transactions for a group
// access:private
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

// route:post /api/transactions
// description:create a transaction
// access:private
router.post('/', protect, async (req, res) => {
  try {
    const payload = { ...req.body };
    // ensure createdby is set
    payload.createdBy = req.user._id;

    // only include group field if it's provided and valid
    if (!payload.group || !require('mongoose').Types.ObjectId.isValid(payload.group)) {
      delete payload.group;
    }

    const tx = await Transaction.create(payload);
    // populate payer and participants.user so frontend consumers receive the expected shape
    const populatedTx = await Transaction.findById(tx._id)
      .populate('payer', 'id name email')
      .populate('participants.user', 'id name email')
      .lean();

    // update group's totals asynchronously (best-effort)
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

// route:get /api/transactions/friend/:friendid/balance
// description:get running balance with a specific friend
// access:private
router.get('/friend/:friendId/balance', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.friendId;
    
    // simplified approach: get all transactions involving both users
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

    // filter to only transactions that involve both users
    const friendTransactions = allTransactions.filter(tx => {
      const payerIsUser = tx.payer._id.toString() === userId.toString();
      const payerIsFriend = tx.payer._id.toString() === friendId.toString();
      const userInParticipants = tx.participants.some(p => p.user._id.toString() === userId.toString());
      const friendInParticipants = tx.participants.some(p => p.user._id.toString() === friendId.toString());
      
      // transaction must involve both users somehow
      return (payerIsUser || userInParticipants) && (payerIsFriend || friendInParticipants);
    });

    let balance = 0;
    let totalPaid = 0;
    let totalOwed = 0;

    // calculate from user's perspective
    friendTransactions.forEach(tx => {
      const userIsPayer = tx.payer._id.toString() === userId.toString();
      
      if (userIsPayer) {
        // user paid the full amount
        totalPaid += tx.amount;
      }
      
      // find user's participant entry to see what they owe
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

// route:get /api/transactions/:id
// description:get transaction by id
// access:private
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

// route:put /api/transactions/:id
// description:update transaction
// access:private
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

// route:delete /api/transactions/:id
// description:delete transaction
// access:private
router.delete('/:id', protect, async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// route:post /api/transactions/:id/settle
// description:mark transaction/participant as settled (simple wrapper)
// access:private
router.post('/:id/settle', protect, async (req, res) => {
  try {
    const { userId, paid, paymentMethodId } = req.body; // expecting userid, paid flag, optional paymentmethodid
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    // attempt to mark the participant as paid first
    await tx.markParticipantPaid(userId || req.user._id, paid !== false);

    // if a payment method id was provided, attempt to record the settlement details
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