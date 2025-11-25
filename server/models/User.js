import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  teamId: {
    type: String,
    default: null
  },
  solvedChallenges: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  banned: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  }
});

// Performance indexes (unique fields already have indexes from unique: true)
userSchema.index({ teamId: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ banned: 1 });

export default mongoose.model('User', userSchema);
