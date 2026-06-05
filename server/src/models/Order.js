const mongoose = require('mongoose');

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
    commissionRate: Number
  }],
  defects: [String],
  photos: [String]
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
