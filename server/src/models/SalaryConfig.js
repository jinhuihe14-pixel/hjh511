const mongoose = require('mongoose');

const salaryConfigSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['receptionist', 'technician', 'repairer'],
    required: true,
    unique: true
  },
  baseSalary: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  pieceRate: {
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
  effectiveMonth: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SalaryConfig', salaryConfigSchema);
