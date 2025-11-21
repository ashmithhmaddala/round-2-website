import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['osint', 'crypto'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  flag: {
    type: String,
    required: true
  },
  solvedBy: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Challenge', challengeSchema);
