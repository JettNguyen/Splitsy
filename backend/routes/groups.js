const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  leaveGroup,
  getGroupBalances
} = require('../controllers/groupController');

const { protect, groupMember, groupAdmin } = require('../middleware/auth');

// validation rules
const createGroupValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
    .withMessage('Invalid currency'),
  body('category')
    .optional()
    .isIn(['trip', 'home', 'couple', 'other'])
    .withMessage('Invalid category'),
  body('memberEmails')
    .optional()
    .isArray()
    .withMessage('Member emails must be an array'),
  body('memberEmails.*')
    .optional()
    .isEmail()
    .withMessage('Invalid email format in member emails')
];

const addMemberValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

// all routes require authentication
router.use(protect);

// group routes
router.get('/', getGroups);
router.post('/', createGroupValidation, createGroup);

// routes that require group membership check
router.get('/:id', groupMember, getGroup);
router.get('/:id/balances', groupMember, getGroupBalances);
router.post('/:id/leave', groupMember, leaveGroup);

// routes that require admin privileges
router.put('/:id', groupMember, groupAdmin, updateGroup);
router.delete('/:id', groupMember, deleteGroup);  // removed groupadmin - check in controller
router.post('/:id/members', groupMember, addMemberValidation, addMember);
router.delete('/:id/members/:userId', groupMember, groupAdmin, removeMember);

module.exports = router;