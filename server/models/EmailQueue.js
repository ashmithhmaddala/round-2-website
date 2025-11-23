import mongoose from 'mongoose';

const emailQueueSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries by the worker
emailQueueSchema.index({ status: 1, createdAt: 1 });

const EmailQueue = mongoose.model('EmailQueue', emailQueueSchema);

export default EmailQueue;
