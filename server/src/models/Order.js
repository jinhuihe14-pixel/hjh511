const mongoose = require('mongoose');

const reworkRecordSchema = new mongoose.Schema({
  reworkCount: {
    type: Number,
    default: 1
  },
  reason: {
    type: String,
    required: true
  },
  fromProcessKey: String,
  fromProcessName: String,
  responsibleUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  responsibleUserName: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const processNodeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sortOrder: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    enum: ['technician', 'repairer', 'inspector', 'receptionist'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rework'],
    default: 'pending'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  claimedAt: Date,
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: Date,
  completedAt: Date,
  duration: {
    type: Number,
    default: 0
  },
  reworkCount: {
    type: Number,
    default: 0
  },
  reworkHistory: [reworkRecordSchema],
  isCountedForSalary: {
    type: Boolean,
    default: false
  },
  salaryCountedAt: Date,
  estimatedDuration: {
    type: Number,
    default: 0
  }
});

const shoeItemSchema = new mongoose.Schema({
  shoeType: String,
  shoeBrand: String,
  shoeColor: String,
  services: [{
    type: {
      type: String,
      enum: ['cleaning', 'repair', 'renew', 'luxury'],
      required: true
    },
    name: String,
    price: Number,
    commissionRate: Number,
    pieceRate: Number
  }],
  defects: [String],
  photos: [String],
  processes: [processNodeSchema],
  totalReworkCount: {
    type: Number,
    default: 0
  },
  currentProcessIndex: {
    type: Number,
    default: 0
  },
  overallStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rework'],
    default: 'pending'
  }
});

const orderSchema = new mongoose.Schema({
  orderNo: {
    type: String,
    required: true,
    unique: true
  },
  pickupCode: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  shoes: [shoeItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  actualAmount: {
    type: Number,
    required: true
  },
  deposit: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'processing', 'completed', 'picked_up', 'cancelled'],
    default: 'pending'
  },
  receptionist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repairer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  pickedUpAt: Date,
  storageDays: {
    type: Number,
    default: 0
  },
  isOverdueNotified: {
    type: Boolean,
    default: false
  },
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
