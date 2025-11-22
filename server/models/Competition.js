import mongoose from 'mongoose';

const competitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'CTF Competition'
  },
  description: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  freezeTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'frozen', 'ended'],
    default: 'upcoming'
  },
  allowLateSubmissions: {
    type: Boolean,
    default: false
  },
  showScoreboard: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedBy: {
    type: String,
    default: 'system'
  }
});

// Only allow one competition settings document
competitionSchema.index({ _id: 1 }, { unique: true });

export default mongoose.model('Competition', competitionSchema);
