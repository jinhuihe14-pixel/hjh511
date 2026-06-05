const mongoose = require('mongoose');

const salaryDetailSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  orderNo: String,
  amount: Number,
  type: {
    type: String,
    enum: ['commission', 'piece', 'repair']
  },
  description: String
});

const salaryRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  baseSalary: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  pieceWork: {
    type: Number,
    default: 0
  },
  repairCommission: {
    type: Number,
    default: 0
  },
  fullAttendanceBonus: {
    type: Number,
    default: 0
  },
  lateDeduction: {
    type: Number,
    default: 0
  },
  otherBonuses: {
    type: Number,
    default: 0
  },
  otherDeductions: {
    type: Number,
    default: 0
  },
  totalSalary: {
    type: Number,
    default: 0
  },
  details: [salaryDetailSchema],
  manualAdjustments: [{
    amount: Number,
    type: {
      type: String,
      enum: ['bonus', 'deduction']
    },
    reason: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  orderCount: {
    type: Number,
    default: 0
  },
  pieceCount: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lockedAt: Date,
  attendance: {
    workDays: Number,
    lateDays: Number,
    leaveDays: Number
  }
}, {
  timestamps: true
});

salaryRecordSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
