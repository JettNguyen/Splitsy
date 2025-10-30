const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// generate jwt token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    register new user
// @route   POST /api/auth/register
// @access  public
const register = async (req, res) => {
  try {
  // check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

  // check if a user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

  // create the user
    const user = await User.create({
      name,
      email,
      password
    });

  // generate jwt token for the new user
    const token = generateToken(user._id);

  // remove password from the returned object
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    
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

// @desc    login user
// @route   POST /api/auth/login
// @access  public
const login = async (req, res) => {
  try {
  // check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

  // fetch user including password for verification
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

  // verify password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

  // generate jwt token
    const token = generateToken(user._id);

  // update the user's last active timestamp
    user.updateLastActive();

  // remove password from the returned user object
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    get the current logged-in user
// @route   GET /api/auth/me
// @access  private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('groups', 'name description memberCount')
      .select('-password');

    res.json(user);

  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting user data'
    });
  }
};

// @desc    update user details
// @route   PUT /api/auth/me
// @access  private
const updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phoneNumber: req.body.phoneNumber,
      preferences: req.body.preferences,
      avatar: req.body.avatar
    };

  // remove undefined fields before updating the db
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
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

// @desc    update password
// @route   PUT /api/auth/updatepassword
// @access  private
const updatePassword = async (req, res) => {
  try {
  // check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id).select('+password');

  // verify the current password
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
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating password'
    });
  }
};

// @desc    add payment method
// @route   POST /api/auth/payment-methods
// @access  private
const addPaymentMethod = async (req, res) => {
  try {
    const { type, handle, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

  // check if this payment method already exists for this user
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
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding payment method'
    });
  }
};

// @desc    remove payment method
// @route   DELETE /api/auth/payment-methods/:methodId
// @access  private
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
    console.error('Remove payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing payment method'
    });
  }
};

  // get payment methods for the authenticated user
  const getPaymentMethods = async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('paymentMethods');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      return res.json({ success: true, data: { paymentMethods: user.paymentMethods || [] } });
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ success: false, message: 'Server error getting payment methods' });
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