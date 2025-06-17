const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  reviewer: {  // Use 'reviewer' consistently (not 'user')
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000
  },
  authenticityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  linguisticAnalysis: {
    sentenceVariety: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    emotionalAuthenticity: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    specificDetails: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    vocabularyComplexity: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    grammarScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  communityValidation: {
    totalVotes: {
      type: Number,
      default: 0
    },
    authenticVotes: {
      type: Number,
      default: 0
    },
    flaggedVotes: {
      type: Number,
      default: 0
    }
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Active', 'Flagged', 'Removed'],
    default: 'Active'
  },
  aiAnalysisData: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Create compound index on product and reviewer (not user)
reviewSchema.index({ product: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
