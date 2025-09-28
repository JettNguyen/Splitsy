const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  addPaymentMethod,
  removePaymentMethod
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const paymentMethodValidation = [
  body('type')
    .isIn(['Venmo', 'PayPal', 'CashApp', 'Zelle'])
    .withMessage('Invalid payment method type'),
  body('handle')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Payment handle is required and must be less than 100 characters')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.use(protect); // All routes below this middleware require authentication

router.get('/me', getMe);
router.put('/me', updateDetails);
router.put('/updatepassword', updatePasswordValidation, updatePassword);
router.post('/payment-methods', paymentMethodValidation, addPaymentMethod);
router.delete('/payment-methods/:methodId', removePaymentMethod);

module.exports = router;