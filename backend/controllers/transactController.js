// transaction controller: handles creating, listing, updating, and settling transactions
// comments describe inputs/outputs at a high level
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');



async function createTransaction(req, res) {
  // create a new transaction from the request body
  // basic validations to ensure required fields are present
  try {
    const {
      description,
      amount,
      currency,
      payer,
      group,
      category,
      splitMethod,
      participants = [],
      notes,
      tags = []
    } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ message: 'description is required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }
    if (!payer || !mongoose.Types.ObjectId.isValid(payer)) {
      return res.status(400).json({ message: 'valid payer id is required' });
    }

  const actualGroup = group || payer;

    const mappedParticipants = participants.map(p => 
      typeof p === 'string' ? { user: p, paid: false } : { user: p.user, paid: false }
    );

  const tx = new Transaction({
      description,
      amount,
      currency: currency || 'USD',
      payer,
      group: actualGroup,
      category: category || 'other',
      splitMethod: splitMethod || 'equal',
      participants: mappedParticipants,
      notes,
      tags,
      createdBy: req.user ? req.user._id : payer
    });

  const saved = await tx.save();


    const populated = await Transaction.findById(saved._id)
      .populate('payer', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');

    return res.status(201).json(populated);
  } catch (err) {
    console.error('createTransaction error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

  // get list of transactions with optional filters and pagination
async function getTransactions(req, res) {
  try {
    const {
      page = 1,
      limit = 25,
      group,
      payer,
      participant,
      status,
      category,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

  const filter = {};
    if (group && mongoose.Types.ObjectId.isValid(group)) filter.group = group;
    if (payer && mongoose.Types.ObjectId.isValid(payer)) filter.payer = payer;
    if (participant && mongoose.Types.ObjectId.isValid(participant)) filter['participants.user'] = participant;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('payer', 'name email')
        .populate('group', 'name')
        .populate('participants.user', 'name email')
    ]);

    return res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      transactions
    });
  } catch (err) {
    console.error('getTransactions error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// get a single transaction by id
async function getTransactionById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const tx = await Transaction.findById(id)
      .populate('payer', 'name email')
      .populate('group', 'name')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    return res.json(tx);
  } catch (err) {
    console.error('getTransactionById error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// update a transaction (partial update)
async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const allowed = ['description', 'amount', 'currency', 'category', 'splitMethod', 'participants', 'notes', 'tags', 'status', 'receipt'];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const updated = await Transaction.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('participants.user', 'name email')
      .populate('payer', 'name email');
    if (!updated) return res.status(404).json({ message: 'Transaction not found' });

    return res.json(updated);
  } catch (err) {
    console.error('updateTransaction error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// delete a transaction
async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const deleted = await Transaction.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Transaction not found' });

    return res.json({ message: 'Deleted', id: deleted._id });
  } catch (err) {
    console.error('deleteTransaction error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// mark a participant as paid or unpaid for a transaction
async function markParticipantPaid(req, res) {
  try {
    const { id } = req.params; // transaction id
    const { userId, paid = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    await tx.markParticipantPaid(userId, paid);
    const refreshed = await Transaction.findById(id).populate('participants.user', 'name email');
    return res.json(refreshed);
  } catch (err) {
    console.error('markParticipantPaid error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// add approval for a transaction
async function addApproval(req, res) {
  try {
    const { id } = req.params; // transaction id
    const { userId, approved, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const tx = await Transaction.findById(id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    await tx.addApproval(userId, !!approved, comment || '');
    const refreshed = await Transaction.findById(id).populate('approvals.user', 'name email');
    return res.json(refreshed);
  } catch (err) {
    console.error('addApproval error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// get a user's balance within a group
async function getUserGroupBalance(req, res) {
  try {
    const { userId, groupId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid userId or groupId' });
    }

    const result = await Transaction.getUserGroupBalance(userId, groupId);
    return res.json(result);
  } catch (err) {
    console.error('getUserGroupBalance error', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  markParticipantPaid,
  addApproval,
  getUserGroupBalance
};
