const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update last active
      user.updateLastActive();
      
      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Check if user is group member
const groupMember = async (req, res, next) => {
  try {
    const Group = require('../models/Group');
    const groupId = req.params.id || req.params.groupId || req.body.group;
    
    console.log('=== GROUP MEMBER MIDDLEWARE DEBUG ===');
    console.log('GroupId:', groupId);
    console.log('User ID:', req.user._id);
    console.log('User:', req.user);
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    const group = await Group.findById(groupId).populate('members.user', 'name email');
    console.log('Found group:', group ? group.name : 'null');
    console.log('Group members:', group ? group.members : 'no group');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    console.log('Calling isMember with user ID:', req.user._id);
    const isMemberResult = group.isMember(req.user._id);
    console.log('isMember result:', isMemberResult);
    
    if (!isMemberResult) {
      console.log('Access denied - user is not a member');
      return res.status(403).json({
        success: false,
        message: 'Access denied - not a member of this group'
      });
    }
    
    console.log('Access granted - user is a member');
    console.log('=== END GROUP MEMBER MIDDLEWARE DEBUG ===');

    req.group = group;
    next();
  } catch (error) {
    console.error('Group member middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking group membership'
    });
  }
};

// Check if user is group admin
const groupAdmin = async (req, res, next) => {
  try {
    // First check if user is a member
    if (!req.group) {
      return res.status(400).json({
        success: false,
        message: 'Group not found in request'
      });
    }

    if (!req.group.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin privileges required'
      });
    }

    next();
  } catch (error) {
    console.error('Group admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking admin privileges'
    });
  }
};

module.exports = {
  protect,
  groupMember,
  groupAdmin
};