const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  wechatId: String,
  address: String,
  memberLevel: {
    type: String,
    enum: ['normal', 'silver', 'gold', 'platinum'],
    default: 'normal'
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
