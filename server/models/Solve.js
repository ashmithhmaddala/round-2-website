import mongoose from 'mongoose';

const solveSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  solvedAt: {
    type: Date,
    default: Date.now
  }
});

// Add a unique compound index to prevent duplicate solves
solveSchema.index({ team: 1, challenge: 1 }, { unique: true });

export default mongoose.model('Solve', solveSchema);