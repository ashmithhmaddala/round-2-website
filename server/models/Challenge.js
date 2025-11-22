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
  flagHash: {
    type: String,
    required: true
  },
  solvedBy: [{
    type: String
  }],
  visible: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  firstBlood: {
    teamCode: { type: String },
    teamName: { type: String },
    solvedAt: { type: Date }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Challenge', challengeSchema);
