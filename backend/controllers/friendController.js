const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// Send friend request
exports.sendRequest = async (req, res, next) => {
  try {
    const fromId = req.user && req.user.id; // assuming auth middleware sets req.user
    const { toId, message } = req.body;

    if (!fromId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!toId) return res.status(400).json({ success: false, message: 'Missing toId' });
    if (fromId === toId) return res.status(400).json({ success: false, message: 'Cannot friend yourself' });

    // Ensure recipient exists
    const recipient = await User.findById(toId);
    if (!recipient) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent duplicate requests or already friends
    const existingFriend = await User.findOne({ _id: fromId, friends: toId });
    if (existingFriend) return res.status(400).json({ success: false, message: 'Already friends' });

    const existingRequest = await FriendRequest.findOne({ from: fromId, to: toId });
    if (existingRequest) return res.status(400).json({ success: false, message: 'Request already sent' });

    const fr = await FriendRequest.create({ from: fromId, to: toId, message: message || '' });
    res.status(201).json({ success: true, request: fr });
  } catch (error) {
    next(error);
  }
};

// List incoming and outgoing requests
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

// Accept request
exports.acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const { requestId } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.to.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Not allowed' });

    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already handled' });

    // Add each other as friends
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: request.from } });
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });

    request.status = 'accepted';
    await request.save();

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
};

// Decline or cancel request
exports.declineRequest = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const { requestId } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Only sender or recipient can cancel/decline
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
// Additional simple helpers: add friend directly (legacy endpoint)
exports.addFriend = async (req, res) => {
  try {
    const UserModel = require('../models/User');
    const { email } = req.body;

    const friend = await UserModel.findOne({ email });
    if (!friend) return res.status(404).json({ success: false, message: 'Friend not found' });

    const user = await UserModel.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.friends.includes(friend._id)) return res.status(400).json({ success: false, message: 'Already friends' });

    user.friends.push(friend._id);
    await user.save();

    const populatedUser = await UserModel.findById(user._id).populate('friends', 'name email avatar');
    res.json({ success: true, message: 'Friend added successfully', user: populatedUser });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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

// Remove/unfriend - remove friend from both users' friends arrays
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const friendIdParam = req.params && req.params.friendId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!friendIdParam) return res.status(400).json({ success: false, message: 'Missing friendId' });
    // basic self-check (only meaningful if client passed an id)
    if (userId.toString() === friendIdParam.toString()) return res.status(400).json({ success: false, message: 'Cannot remove yourself' });

    const UserModel = require('../models/User');
    console.log(`Remove friend request: requester=${userId} friendIdParam=${friendIdParam}`);

    // Load requester to inspect their friends array
    const requester = await UserModel.findById(userId).exec();
    if (!requester) return res.status(404).json({ success: false, message: 'Requesting user not found' });
    console.log('Requester friends (raw):', requester.friends);

    // We'll resolve the friend document and the ObjectId we'll use for updates
    let friend = null;
    let friendIdToUse = null;

    // If the client passed an email (contains @), do a case-insensitive email lookup
    if (typeof friendIdParam === 'string' && friendIdParam.includes('@')) {
      // escape user input for regex
      const esc = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const emailRegex = new RegExp(`^${esc(friendIdParam)}$`, 'i');
      const friendByEmail = await UserModel.findOne({ email: { $regex: emailRegex } });
      if (!friendByEmail) {
        console.log('No user found by email lookup for:', friendIdParam);
        return res.status(404).json({ success: false, message: 'Friend not found by id or email' });
      }
      // ensure this user is actually in requester's friends
      const isFriendByEmail = requester.friends.some(f => f.toString() === friendByEmail._id.toString());
      if (!isFriendByEmail) {
        console.log('User found by email but not present in requester.friends:', friendByEmail._id);
        return res.status(400).json({ success: false, message: 'The specified user is not in your friends list' });
      }
      friend = friendByEmail;
      friendIdToUse = friend._id;
    } else {
      // treat the param as an ObjectId string
      friendIdToUse = friendIdParam;
      // check membership
      const isFriendDirect = requester.friends.some(f => f.toString() === friendIdToUse.toString());
      if (!isFriendDirect) {
        console.log('Friend id not present in requester.friends:', friendIdToUse);
        return res.status(400).json({ success: false, message: 'The specified user is not in your friends list' });
      }
      try {
        friend = await UserModel.findById(friendIdToUse);
      } catch (e) {
        console.warn('findById failed for friendId even though present in requester.friends', friendIdToUse, e);
        return res.status(500).json({ success: false, message: 'Server error looking up friend' });
      }
      if (!friend) {
        console.log('Referenced friend document missing for id:', friendIdToUse);
        return res.status(404).json({ success: false, message: 'Friend document not found despite being referenced' });
      }
    }

    // Remove each other from friends arrays using the resolved ObjectId
    await UserModel.findByIdAndUpdate(userId, { $pull: { friends: friendIdToUse } });
    await UserModel.findByIdAndUpdate(friendIdToUse, { $pull: { friends: userId } });

    // Return updated friends list for the requester
    const updatedUser = await UserModel.findById(userId).populate('friends', 'name email avatar');
    res.json({ success: true, message: 'Friend removed successfully', friends: updatedUser.friends });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Debug helper: return the authenticated user's id and populated friends
exports.debugUser = async (req, res) => {
  try {
    const UserModel = require('../models/User');
    if (!req.user || !req.user._id) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await UserModel.findById(req.user._id).populate('friends', 'name email _id');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, friends: user.friends } });
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
