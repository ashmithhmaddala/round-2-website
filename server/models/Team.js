import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  members: [{
    type: String
  }],
  score: {
    type: Number,
    default: 0
  },
  solvedChallenges: [{
    type: String
  }],
  lastSolveTime: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Performance indexes (unique fields already have indexes from unique: true)
teamSchema.index({ score: -1 }); // Descending for leaderboard
teamSchema.index({ lastSolveTime: 1 }); // For tie-breaking

export default mongoose.model('Team', teamSchema);
