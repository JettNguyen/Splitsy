const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Transaction description is required'],
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer is required']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'food',
      'transportation',
      'accommodation',
      'entertainment',
      'shopping',
      'utilities',
      'healthcare',
      'other'
    ],
    default: 'other'
  },
  splitMethod: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    default: 'equal'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      // amount may be set by split calculations (percentage/equal). Not required on input for percentage splits.
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'settled', 'cancelled'],
    default: 'pending'
  },
  receipt: {
    imageUrl: String,
    uploadedAt: Date,
    scannedData: {
      vendor: String,
      total: Number,
      items: [{
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 }
      }],
      date: Date
    }
  },
  // optional itemized breakdown submitted by client
  items: [{
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  location: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  recurringInfo: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
    },
    nextDue: Date,
    endDate: Date
  },
  approvals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approved: {
      type: Boolean,
      required: true
    },
    approvedAt: {
      type: Date,
      default: Date.now
    },
    comment: String
  }],
  settledAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total owed by participants
transactionSchema.virtual('totalOwed').get(function() {
  return this.participants.reduce((sum, participant) => {
    return sum + participant.amount;
  }, 0);
});

// Virtual for remaining amount to be paid
transactionSchema.virtual('remainingAmount').get(function() {
  const paidAmount = this.participants.reduce((sum, participant) => {
    return sum + (participant.paid ? participant.amount : 0);
  }, 0);
  return this.amount - paidAmount;
});

// Virtual for completion percentage
transactionSchema.virtual('completionPercentage').get(function() {
  if (this.amount === 0) return 100;
  
  const paidAmount = this.participants.reduce((sum, participant) => {
    return sum + (participant.paid ? participant.amount : 0);
  }, 0);
  
  return Math.round((paidAmount / this.amount) * 100);
});

// Virtual for whether transaction needs approval
transactionSchema.virtual('needsApproval').get(function() {
  return this.status === 'pending' && this.approvals.length === 0;
});

// Indexes for better query performance
transactionSchema.index({ group: 1 });
transactionSchema.index({ payer: 1 });
transactionSchema.index({ 'participants.user': 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ category: 1 });

// Compound indexes
transactionSchema.index({ group: 1, status: 1 });
transactionSchema.index({ group: 1, createdAt: -1 });

// Pre-save middleware to validate split amounts
transactionSchema.pre('save', function(next) {
  // If items are provided, derive participants and amounts from them
  if (this.items && this.items.length > 0) {
    const map = {}; // userId -> amount
    this.items.forEach(it => {
      const price = Number(it.price || 0) * Number(it.quantity || 1);
      const assignees = (it.assignees || []).map(a => a.toString());
      if (!assignees || assignees.length === 0) {
        // assign to payer
        const pid = this.payer ? this.payer.toString() : this.createdBy?.toString();
        map[pid] = (map[pid] || 0) + price;
      } else {
        const per = price / assignees.length;
        assignees.forEach(a => {
          map[a] = (map[a] || 0) + per;
        });
      }
    });

    // set participants array based on map
    this.participants = Object.keys(map).map(k => ({ user: k, amount: Math.round(map[k] * 100) / 100 }));
    // If amount wasn't provided or is zero, set it to the sum of item prices
    const sumItems = Object.values(map).reduce((s, v) => s + v, 0);
    if (!this.amount || this.amount <= 0) {
      this.amount = Math.round(sumItems * 100) / 100;
    }
  }

  if (this.splitMethod === 'equal') {
    this.calculateEqualSplit();
  } else if (this.splitMethod === 'percentage') {
    this.validatePercentageSplit();
  }
  
  this.validateParticipantAmounts();
  next();
});

// Method to calculate equal split
transactionSchema.methods.calculateEqualSplit = function() {
  if (this.participants.length === 0) return;
  
  const amountPerPerson = this.amount / this.participants.length;
  this.participants.forEach(participant => {
    participant.amount = Math.round(amountPerPerson * 100) / 100; // Round to 2 decimals
  });
  
  // Handle rounding differences
  const totalCalculated = this.participants.reduce((sum, p) => sum + p.amount, 0);
  const difference = Math.round((this.amount - totalCalculated) * 100) / 100;
  
  if (difference !== 0) {
    this.participants[0].amount += difference;
  }
};

// Method to validate percentage split
transactionSchema.methods.validatePercentageSplit = function() {
  const totalPercentage = this.participants.reduce((sum, participant) => {
    return sum + (participant.percentage || 0);
  }, 0);
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Percentages must add up to 100%');
  }
  
  this.participants.forEach(participant => {
    participant.amount = Math.round(
      (this.amount * participant.percentage / 100) * 100
    ) / 100;
  });
};

// Method to validate participant amounts
transactionSchema.methods.validateParticipantAmounts = function() {
  const totalParticipantAmount = this.participants.reduce((sum, participant) => {
    return sum + participant.amount;
  }, 0);
  
  const difference = Math.abs(totalParticipantAmount - this.amount);
  if (difference > 0.01) { // Allow for small rounding differences
    throw new Error(
      `Participant amounts (${totalParticipantAmount}) do not match transaction amount (${this.amount})`
    );
  }
};

// Method to mark participant as paid
transactionSchema.methods.markParticipantPaid = function(userId, paid = true) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) {
    throw new Error('User is not a participant in this transaction');
  }
  
  participant.paid = paid;
  participant.paidAt = paid ? new Date() : null;
  
  // Check if transaction is fully settled
  const allPaid = this.participants.every(p => p.paid);
  if (allPaid && this.status !== 'settled') {
    this.status = 'settled';
    this.settledAt = new Date();
  } else if (!allPaid && this.status === 'settled') {
    this.status = 'approved';
    this.settledAt = null;
  }
  
  return this.save();
};

// Method to add approval
transactionSchema.methods.addApproval = function(userId, approved, comment = '') {
  // Remove existing approval from this user
  this.approvals = this.approvals.filter(
    approval => approval.user.toString() !== userId.toString()
  );
  
  // Add new approval
  this.approvals.push({
    user: userId,
    approved: approved,
    approvedAt: new Date(),
    comment: comment
  });
  
  // Check if all participants have approved
  if (approved && this.status === 'pending') {
    const allParticipantsApproved = this.participants.every(participant => {
      return this.approvals.some(approval => 
        approval.user.toString() === participant.user.toString() && 
        approval.approved === true
      );
    });
    
    if (allParticipantsApproved) {
      this.status = 'approved';
    }
  }
  
  return this.save();
};

// Static method to get user's balance in a group
transactionSchema.statics.getUserGroupBalance = async function(userId, groupId) {
  const result = await this.aggregate([
    {
      $match: {
          group: new mongoose.Types.ObjectId(groupId),
          $or: [
            { payer: new mongoose.Types.ObjectId(userId) },
            { 'participants.user': new mongoose.Types.ObjectId(userId) }
          ],
          status: { $ne: 'cancelled' }
        }
    },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: {
            $cond: [
              { $eq: ['$payer', new mongoose.Types.ObjectId(userId)] },
              '$amount',
              0
            ]
          }
        },
        totalOwed: {
          $sum: {
            $reduce: {
              input: '$participants',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.user', new mongoose.Types.ObjectId(userId)] },
                  { $add: ['$$value', '$$this.amount'] },
                  '$$value'
                ]
              }
            }
          }
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return { balance: 0, totalPaid: 0, totalOwed: 0 };
  }
  
  const { totalPaid, totalOwed } = result[0];
  return {
    balance: totalPaid - totalOwed,
    totalPaid,
    totalOwed
  };
};

module.exports = mongoose.model('Transaction', transactionSchema);