import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'urgent'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  pinned: {
    type: Boolean,
    default: false
  }
});

// Index for efficient queries
announcementSchema.index({ active: 1, createdAt: -1 });
announcementSchema.index({ pinned: 1, createdAt: -1 });

export default mongoose.model('Announcement', announcementSchema);
