const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
  },
  category: {
    type: String,
    enum: ['trip', 'home', 'couple', 'other'],
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  settledExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  settings: {
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    },
    defaultSplitMethod: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal'
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for unsettled amount
groupSchema.virtual('unsettledAmount').get(function() {
  return this.totalExpenses - this.settledExpenses;
});

// Virtual for balance status
groupSchema.virtual('isBalanced').get(function() {
  return this.totalExpenses === this.settledExpenses;
});

// Index for better query performance
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ lastActivity: -1 });

// Pre-save middleware to set creator as admin
groupSchema.pre('save', function(next) {
  if (this.isNew) {
    // Ensure creator is in members array as admin
    const creatorInMembers = this.members.find(
      member => member.user.toString() === this.creator.toString()
    );
    
    if (!creatorInMembers) {
      this.members.push({
        user: this.creator,
        role: 'admin',
        joinedAt: new Date()
      });
    } else {
      // Ensure creator has admin role
      creatorInMembers.role = 'admin';
    }
  }
  
  // Update last activity
  this.lastActivity = new Date();
  next();
});

// Method to add member
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this group');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Method to remove member
groupSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    member => member.user.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this group');
  }
  
  // Don't allow removing the creator
  if (this.members[memberIndex].user.toString() === this.creator.toString()) {
    throw new Error('Cannot remove group creator');
  }
  
  this.members.splice(memberIndex, 1);
  return this.save();
};

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
  console.log('isMember check - userId:', userId);
  console.log('isMember check - members:', this.members);
  
  const result = this.members.some(member => {
    // Handle both populated and non-populated cases
    const memberUserId = member.user._id || member.user;
    console.log('Comparing memberUserId:', memberUserId, 'with userId:', userId);
    const match = memberUserId.toString() === userId.toString();
    console.log('Match result:', match);
    return match;
  });
  
  console.log('Final isMember result:', result);
  return result;
};

// Method to check if user is admin
groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member => {
    // Handle both populated and non-populated cases
    const memberUserId = member.user._id || member.user;
    return memberUserId.toString() === userId.toString();
  });
  return member && member.role === 'admin';
};

// Method to update financial totals
groupSchema.methods.updateTotals = async function() {
  const Transaction = mongoose.model('Transaction');
  
  const totals = await Transaction.aggregate([
    {
      $match: {
        group: this._id,
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalExpenses: {
          $sum: '$amount'
        },
        settledExpenses: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'settled'] },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ]);
  
  if (totals.length > 0) {
    this.totalExpenses = totals[0].totalExpenses || 0;
    this.settledExpenses = totals[0].settledExpenses || 0;
  } else {
    this.totalExpenses = 0;
    this.settledExpenses = 0;
  }
  
  return this.save();
};

module.exports = mongoose.model('Group', groupSchema);