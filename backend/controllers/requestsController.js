// TEMPORARY FILE TO GET THINGS WORKING - REPLACE MOCKS WITH REAL MODELS


const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Mock models (replace with your real Mongoose models)
const FriendRequest = mongoose.model('FriendRequest', new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
}));

// Send a friend request
exports.sendFriendRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { toId, message } = req.body;
  const fromId = req.user.id;

  try {
    // Prevent sending request to yourself
    if (fromId === toId) return res.status(400).json({ message: 'Cannot send request to yourself' });

    const existing = await FriendRequest.findOne({ from: fromId, to: toId, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'Request already sent' });

    const request = await FriendRequest.create({ from: fromId, to: toId, message });
    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List all friend requests for current user
exports.listFriendRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const requests = await FriendRequest.find({ to: userId, status: 'pending' }).populate('from', 'name email');
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept a friend request
exports.acceptFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.to.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    request.status = 'accepted';
    await request.save();

    res.json({ message: 'Friend request accepted', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Decline a friend request
exports.declineFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.to.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    request.status = 'declined';
    await request.save();

    res.json({ message: 'Friend request declined' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
