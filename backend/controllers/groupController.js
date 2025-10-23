const Group = require('../models/Group');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { validationResult } = require('express-validator');

// description: get all groups for the authenticated user
// route: get /api/groups
// access: private
const getGroups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const groups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    })
    .populate('creator', 'name email')
    .populate('members.user', 'name email')
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Group.countDocuments({
      'members.user': req.user._id,
      isActive: true
    });

    res.json(groups);

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting groups'
    });
  }
};

// description: get a single group by id
// route: get /api/groups/:id
// access: private
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name email avatar')
      .populate('members.user', 'name email avatar paymentMethods');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

  // check if the requesting user is a member
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not a member of this group'
      });
    }

  // get recent transactions for the group
    const recentTransactions = await Transaction.find({
      $or: [
        { group: group._id },     // transactions in this group
        { group: { $exists: false } }, // transactions without a group field
        { group: null }           // transactions with group explicitly null
      ]
    })
    .populate('payer', 'name email')
    .populate('participants.user', 'name email')
    .sort({ createdAt: -1 })
    .limit(10);
  // get group statistics
    const stats = await Transaction.aggregate([
      { $match: { group: group._id, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageExpense: { $avg: '$amount' }
        }
      }
    ]);

    const groupStats = stats[0] || {
      totalExpenses: 0,
      transactionCount: 0,
      averageExpense: 0
    };

    res.json({
      success: true,
      data: {
        group,
        recentTransactions,
        stats: groupStats
      }
    });

  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting group'
    });
  }
};

// description: create a new group
// route: post /api/groups
// access: private
const createGroup = async (req, res) => {
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

    const { name, description, currency, category, memberEmails } = req.body;

    // create group
    const group = await Group.create({
      name,
      description,
      currency: currency || 'USD',
      category: category || 'other',
      creator: req.user._id
    });

  // add invited members if provided (by email)
    if (memberEmails && memberEmails.length > 0) {
      for (const email of memberEmails) {
        try {
          const user = await User.findOne({ email: email.toLowerCase() });
          if (user && !group.isMember(user._id)) {
            await group.addMember(user._id);
            
            // add group to user's groups array
            user.groups.push(group._id);
            await user.save();
          }
        } catch (memberError) {
          console.warn(`Could not add member ${email}:`, memberError.message);
        }
      }
    }

  // add the created group to the creator's groups array
    const creator = await User.findById(req.user._id);
    creator.groups.push(group._id);
    await creator.save();

  // populate the response with creator and members info
    await group.populate('creator', 'name email');
    await group.populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: group
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating group'
    });
  }
};

// description: update group
// route: put /api/groups/:id
// access: private (admin only)
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

  // check if user is admin
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin privileges required'
      });
    }

    const fieldsToUpdate = {
      name: req.body.name,
      description: req.body.description,
      currency: req.body.currency,
      category: req.body.category,
      settings: req.body.settings
    };

  // remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    )
    .populate('creator', 'name email')
    .populate('members.user', 'name email');

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: { group: updatedGroup }
    });

  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating group'
    });
  }
};

// description: delete (deactivate) group
// route: delete /api/groups/:id
// access: private (admin only)
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members.user', 'name email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // check if user is admin
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin privileges required'
      });
    }

  // check if there are unsettled transactions
    const unsettledTransactions = await Transaction.countDocuments({
      group: group._id,
      status: { $in: ['pending', 'approved'] }
    });

    if (unsettledTransactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete group with unsettled transactions'
      });
    }

  // mark group as inactive instead of deleting
    group.isActive = false;
    await group.save();

  // remove group from all users' groups arrays
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting group'
    });
  }
};

// description: add a member to the group
// route: post /api/groups/:id/members
// access: private (admin or when invites allowed)
const addMember = async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // check permissions
    const canInvite = group.isAdmin(req.user._id) || 
                     (group.settings.allowMemberInvites && group.isMember(req.user._id));
    
    if (!canInvite) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - cannot invite members to this group'
      });
    }

    // find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // add member to group
    await group.addMember(user._id);
    
    // add group to user's groups array
    user.groups.push(group._id);
    await user.save();

    // populate the updated group
    await group.populate('members.user', 'name email');

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { group }
    });

  } catch (error) {
    if (error.message === 'User is already a member of this group') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding member'
    });
  }
};

// description: remove member from group
// route: delete /api/groups/:id/members/:userid
// access: private (admin only)
const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // check if user is admin
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - admin privileges required'
      });
    }

    const userToRemove = req.params.userId;

    // check if user has unsettled transactions
    const unsettledTransactions = await Transaction.countDocuments({
      group: group._id,
      $or: [
        { payer: userToRemove },
        { 'participants.user': userToRemove }
      ],
      status: { $in: ['pending', 'approved'] }
    });

    if (unsettledTransactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove member with unsettled transactions'
      });
    }

    // remove member from group
    await group.removeMember(userToRemove);
    
    // remove group from user's groups array
    await User.findByIdAndUpdate(
      userToRemove,
      { $pull: { groups: group._id } }
    );

    // populate the updated group
    await group.populate('members.user', 'name email');

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: { group }
    });

  } catch (error) {
    if (error.message.includes('Cannot remove group creator') || 
        error.message.includes('User is not a member')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing member'
    });
  }
};

// description: leave group
// route: post /api/groups/:id/leave
// access: private
const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // check if user is a member
    if (!group.isMember(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // don't allow creator to leave group
    if (group.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Group creator cannot leave group. Transfer ownership or delete group instead.'
      });
    }

    // check if user has unsettled transactions
    const unsettledTransactions = await Transaction.countDocuments({
      group: group._id,
      $or: [
        { payer: req.user._id },
        { 'participants.user': req.user._id }
      ],
      status: { $in: ['pending', 'approved'] }
    });

    if (unsettledTransactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave group with unsettled transactions'
      });
    }

    // remove member from group
    await group.removeMember(req.user._id);
    
    // remove group from user's groups array
    req.user.groups.pull(group._id);
    await req.user.save();

    res.json({
      success: true,
      message: 'Left group successfully'
    });

  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error leaving group'
    });
  }
};

// description: get group balances for each member
// route: get /api/groups/:id/balances
// access: private (members only)
const getGroupBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // check if user is a member
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not a member of this group'
      });
    }

    // calculate balances for each member
    const balances = [];
    
    for (const member of group.members) {
      const balance = await Transaction.getUserGroupBalance(
        member.user._id, 
        group._id
      );
      
      balances.push({
        user: member.user,
        ...balance
      });
    }

    res.json({
      success: true,
      data: { balances }
    });

  } catch (error) {
    console.error('Get group balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting group balances'
    });
  }
};

module.exports = {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  leaveGroup,
  getGroupBalances
};