const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const mongoose = require('mongoose');

// friend controller: manage friend relationships, requests, and helpers
// keep responses minimal and avoid leaking sensitive data
exports.addFriend = async (req, res) => {
  try {
    const UserModel = require('../models/User');
    const { email } = req.body;

    const friend = await UserModel.findOne({ email });
    if (!friend) return res.status(404).json({ success: false, message: 'Friend not found' });

    const user = await UserModel.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (user.friends.includes(friend._id)) return res.status(400).json({ success: false, message: 'Already friends' });

  // add friend to current user's friends list
    user.friends.push(friend._id);
    await user.save();

    // add user to the friends list as well
    friend.friends.push(user._id);
    await friend.save();

    const populatedUser = await UserModel.findById(user._id).populate('friends', 'name email avatar');
    res.json({ success: true, message: 'Friend added successfully', user: populatedUser });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// get friends list to display on the frontend
exports.getFriends = async (req, res) => {
  try {
    const UserModel = require('../models/User');
    const user = await UserModel.findById(req.user._id).populate('friends', 'name email avatar');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, friends: user.friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// remove/unfriend - remove a friend from both users' friend arrays
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user?.id;
    const friendId = req.params?.friendId;

    if (!userId || !friendId) {
      return res.status(400).json({ success: false, message: 'Missing user or friend ID' });
    }

    if (userId === friendId) {
      return res.status(400).json({ success: false, message: 'Cannot remove yourself' });
    }

    // validate that friendId is a valid mongodb object id
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ success: false, message: 'Invalid friend ID' });
    }

    // use the string directly or convert with 'new'
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    const updatedUser = await User.findById(userId).populate('friends', 'name email avatar');
    res.json({ success: true, message: 'Friend removed successfully', friends: updatedUser.friends });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ success: false, message: 'server controller error' });
  }
};

// debug helper: return the authenticated user's id and populated friends


// get a friend's public payment methods by user id
exports.getFriendPaymentMethods = async (req, res) => {
  try {
  // minimal debug output; avoid printing tokens or full headers in production
    if ((process.env.NODE_ENV || 'development') === 'development') {
      const authHeader = req.headers.authorization || '';
      const tokenPreview = authHeader.startsWith('Bearer ') ? `${authHeader.slice(0, 20)}...` : authHeader;
      console.debug && console.debug('[getFriendPaymentMethods] incoming:', { method: req.method, url: req.originalUrl, authPresent: !!authHeader, tokenPreview });
    }
    const friendId = req.params.friendId;
    if (!friendId) return res.status(400).json({ success: false, message: 'Missing friend id' });

    const friend = await User.findById(friendId).select('paymentMethods name email');
    if (!friend) return res.status(404).json({ success: false, message: 'Friend not found' });

  // only expose non-sensitive fields (id, type, handle, isDefault)
    const methods = (friend.paymentMethods || []).map(m => ({ id: m._id, type: m.type, handle: m.handle, isDefault: m.isDefault }));
    return res.json({ success: true, data: { user: { id: friend._id, name: friend.name, email: friend.email }, paymentMethods: methods } });
  } catch (err) {
    console.error('Get friend payment methods error:', err);
    return res.status(500).json({ success: false, message: 'server error' });
  }
};


// friend request endpoints

// send a friend request
exports.sendRequest = async (req, res, next) => {
  try {
    const fromId = req.user && req.user.id; // assuming auth middleware sets req.user
    const { toId, message } = req.body;

  if (!fromId) return res.status(401).json({ success: false, message: 'unauthorized' });
  if (!toId) return res.status(400).json({ success: false, message: 'missing toId' });
  if (fromId === toId) return res.status(400).json({ success: false, message: 'cannot friend yourself' });

  // ensure the recipient exists
    const recipient = await User.findById(toId);
    if (!recipient) return res.status(404).json({ success: false, message: 'User not found' });

  // prevent duplicate requests or if already friends
    const existingFriend = await User.findOne({ _id: fromId, friends: toId });
    if (existingFriend) return res.status(400).json({ success: false, message: 'already friends' });

    const existingRequest = await FriendRequest.findOne({ from: fromId, to: toId });
    if (existingRequest) return res.status(400).json({ success: false, message: 'request already sent' });

    const fr = await FriendRequest.create({ from: fromId, to: toId, message: message || '' });
    res.status(201).json({ success: true, request: fr });
  } catch (error) {
    next(error);
  }
};

// list incoming and outgoing requests
exports.listRequests = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const incoming = await FriendRequest.find({ to: userId }).populate('from', 'id name email avatar');
    const outgoing = await FriendRequest.find({ from: userId }).populate('to', 'id name email avatar');

    res.json({ success: true, incoming, outgoing });
  } catch (error) {
    next(error);
  }
};

// accept a friend request
exports.acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const { requestId } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.to.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Not allowed' });

    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already handled' });

  // add each other as friends
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: request.from } });
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });

    request.status = 'accepted';
    await request.save();

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
};

// decline or cancel a friend request
exports.declineRequest = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const { requestId } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // only sender or recipient can cancel/decline
    if (request.from.toString() !== userId.toString() && request.to.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    request.status = 'declined';
    await request.save();

    res.json({ success: true, message: 'Friend request declined' });
  } catch (error) {
    next(error);
  }
};
