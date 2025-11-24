import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  actor: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'system'],
    default: 'user'
  },
  details: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Performance indexes
logSchema.index({ timestamp: -1 }); // For sorting logs newest first
logSchema.index({ action: 1 });
logSchema.index({ actor: 1 });
logSchema.index({ role: 1 });

// TTL index - automatically delete logs older than 30 days
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

export default mongoose.model('Log', logSchema);
