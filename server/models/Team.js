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
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Team', teamSchema);
