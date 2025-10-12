const User = require('../models/User');

const addFriend = async (req, res) => {
  try {
    const { email } = req.body;

    // Find the friend by email
    const friend = await User.findOne({ email }); // touches the database

    if (!friend) {
      return res.status(404).json({ success: false, message: 'Friend not found' });
    }

    // Find the current logged-in user
    const user = await User.findById(req.user._id);

    // Prevent adding the same friend twice
    if (user.friends.includes(friend._id)) {
      return res.status(400).json({ success: false, message: 'Already friends' });
    }

    // Add friend to user's friend list
    user.friends.push(friend._id);
    await user.save();

    // Populate the friends field
    const populatedUser = await User.findById(user._id).populate('friends', 'name email');

    // Return full user object so frontend can update UI
    res.json({ success: true, message: 'Friend added successfully', user: populatedUser });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ success: false, message: 'Server error' }); // sends the result back to frontend
  }
};

const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'name email'); // populate with only necessary fields

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, friends: user.friends });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



module.exports = { addFriend, getFriends };
