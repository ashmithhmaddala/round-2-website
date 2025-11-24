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
  files: [{
    filename: { type: String },
    originalName: { type: String },
    size: { type: Number },
    mimetype: { type: String },
    gridFsId: { type: mongoose.Schema.Types.ObjectId },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Performance indexes
challengeSchema.index({ id: 1 }); // Unique already creates index
challengeSchema.index({ visible: 1 });
challengeSchema.index({ disabled: 1 });
challengeSchema.index({ category: 1 });
challengeSchema.index({ visible: 1, disabled: 1 }); // Compound index for queries

export default mongoose.model('Challenge', challengeSchema);
