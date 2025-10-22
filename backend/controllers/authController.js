const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate a signed JWT for the given user id
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Auth controller - register error:', error && (error.message || error));
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check for user with password field included
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last active
    user.updateLastActive();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
  console.error('Auth controller - login error:', error && (error.message || error));
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('groups', 'name description memberCount')
      .select('-password');

    res.json(user);

  } catch (error) {
  console.error('Auth controller - getMe error:', error && (error.message || error));
    res.status(500).json({
      success: false,
      message: 'Server error getting user data'
    });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/me
// @access  Private
const updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      preferences: req.body.preferences,
      avatar: req.body.avatar
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
  console.error('Auth controller - updateDetails error:', error && (error.message || error));
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password updated successfully',
      data: { token }
    });

  } catch (error) {
  console.error('Auth controller - updatePassword error:', error && (error.message || error));
    res.status(500).json({
      success: false,
      message: 'Server error updating password'
    });
  }
};

// @desc    Add payment method
// @route   POST /api/auth/payment-methods
// @access  Private
const addPaymentMethod = async (req, res) => {
  try {
    const { type, handle, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    // If this is set as default, remove default from others
    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    // Check if this payment method already exists
    const existingMethod = user.paymentMethods.find(
      method => method.type === type && method.handle === handle
    );

    if (existingMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method already exists'
      });
    }

    user.paymentMethods.push({ type, handle, isDefault });
    await user.save();

    res.json({
      success: true,
      message: 'Payment method added successfully',
      data: { paymentMethods: user.paymentMethods }
    });

  } catch (error) {
  console.error('Auth controller - addPaymentMethod error:', error && (error.message || error));
    res.status(500).json({
      success: false,
      message: 'Server error adding payment method'
    });
  }
};

// @desc    Remove payment method
// @route   DELETE /api/auth/payment-methods/:methodId
// @access  Private
const removePaymentMethod = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const methodIndex = user.paymentMethods.findIndex(
      method => method._id.toString() === req.params.methodId
    );

    if (methodIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    user.paymentMethods.splice(methodIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Payment method removed successfully',
      data: { paymentMethods: user.paymentMethods }
    });

  } catch (error) {
  console.error('Auth controller - removePaymentMethod error:', error && (error.message || error));
    res.status(500).json({
      success: false,
      message: 'Server error removing payment method'
    });
  }
};

// @desc    Get current user's payment methods
// @route   GET /api/auth/payment-methods
// @access  Private
const getPaymentMethods = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('paymentMethods');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { paymentMethods: user.paymentMethods } });
  } catch (error) {
  console.error('Auth controller - getPaymentMethods error:', error && (error.message || error));
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  addPaymentMethod,
  removePaymentMethod,
  getPaymentMethods
};