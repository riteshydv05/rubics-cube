import mongoose from 'mongoose';

const solveHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  initialCubeState: {
    type: Object,
    required: [true, 'Initial cube state is required'],
    validate: {
      validator: function(state) {
        // Validate that all 6 faces exist with 9 colors each
        const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
        return faces.every(face => 
          Array.isArray(state[face]) && state[face].length === 9
        );
      },
      message: 'Invalid cube state format'
    }
  },
  solution: [{
    notation: {
      type: String,
      required: true
    },
    face: {
      type: String,
      enum: ['U', 'D', 'F', 'B', 'L', 'R'],
      required: true
    },
    direction: {
      type: String,
      enum: ['clockwise', 'counterclockwise', 'double'],
      required: true
    },
    description: String
  }],
  moveCount: {
    type: Number,
    required: true,
    min: [0, 'Move count cannot be negative']
  },
  solveTime: {
    type: Number, // Time in milliseconds
    default: null
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Compound index for efficient user history queries
solveHistorySchema.index({ userId: 1, createdAt: -1 });

// Virtual for formatted solve time
solveHistorySchema.virtual('formattedSolveTime').get(function() {
  if (!this.solveTime) return null;
  const seconds = Math.floor(this.solveTime / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
});

// Static method to get user statistics
solveHistorySchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), completed: true } },
    {
      $group: {
        _id: '$userId',
        totalSolves: { $sum: 1 },
        totalMoves: { $sum: '$moveCount' },
        avgMoves: { $avg: '$moveCount' },
        minMoves: { $min: '$moveCount' },
        maxMoves: { $max: '$moveCount' },
        avgSolveTime: { $avg: '$solveTime' },
        fastestSolve: { $min: '$solveTime' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalSolves: 0,
      totalMoves: 0,
      avgMoves: 0,
      minMoves: 0,
      maxMoves: 0,
      avgSolveTime: 0,
      fastestSolve: 0
    };
  }

  return stats[0];
};

// Static method to get recent solves
solveHistorySchema.statics.getRecentSolves = async function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-initialCubeState.solution'); // Exclude large solution data for list view
};

// Instance method to mark as completed
solveHistorySchema.methods.markCompleted = async function(solveTime = null) {
  this.completed = true;
  this.completedAt = new Date();
  if (solveTime) {
    this.solveTime = solveTime;
  }
  return this.save();
};

// Ensure virtuals are included in JSON output
solveHistorySchema.set('toJSON', { virtuals: true });
solveHistorySchema.set('toObject', { virtuals: true });

const SolveHistory = mongoose.model('SolveHistory', solveHistorySchema);

export default SolveHistory;
