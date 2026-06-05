const mongoose = require('mongoose');

const salaryAppealSchema = new mongoose.Schema({
  salaryRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryRecord',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  detailId: {
    type: String,
    required: true
  },
  detailSnapshot: {
    orderId: mongoose.Schema.Types.ObjectId,
    orderNo: String,
    originalAmount: Number,
    type: {
      type: String,
      enum: ['commission', 'piece', 'repair']
    },
    description: String
  },
  expectedAmount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  rejectReason: String,
  adjustmentId: String
}, {
  timestamps: true
});

salaryAppealSchema.index({ salaryRecord: 1, detailId: 1, status: 1 });
salaryAppealSchema.index({ user: 1, createdAt: -1 });
salaryAppealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SalaryAppeal', salaryAppealSchema);
