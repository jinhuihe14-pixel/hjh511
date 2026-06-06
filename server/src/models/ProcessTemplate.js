const mongoose = require('mongoose');

const processStepSchema = new mongoose.Schema({
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
  estimatedDuration: {
    type: Number,
    default: 0
  },
  description: String
});

const processTemplateSchema = new mongoose.Schema({
  serviceCategory: {
    type: String,
    enum: ['cleaning', 'repair', 'renew', 'luxury'],
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  steps: [processStepSchema],
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

module.exports = mongoose.model('ProcessTemplate', processTemplateSchema);
