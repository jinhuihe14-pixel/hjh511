const mongoose = require('mongoose');

const serviceItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['cleaning', 'repair', 'renew', 'luxury'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  pieceRate: {
    type: Number,
    default: 0
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServiceItem', serviceItemSchema);
