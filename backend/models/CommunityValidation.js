const mongoose = require('mongoose');

const communityValidationSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['user', 'product', 'review', 'image'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Product', 'Review']
  },
  validationType: {
    type: String,
    enum: ['authenticity', 'fraud_detection', 'quality_assessment', 'trust_verification'],
    required: true
  },
  question: {
    type: String,
    required: true
    // e.g., "Is this review authentic?", "Is this user trustworthy?"
  },
  validators: [{
    validator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vote: {
      type: String,
      enum: ['authentic', 'fake', 'suspicious', 'trustworthy', 'untrustworthy'],
      required: true
    },
    confidence: {
      type: Number,
      min: 1,
      max: 100,
      required: true
    },
    reasoning: {
      type: String,
      maxlength: 500
    },
    evidence: [{
      type: String,
      description: String,
      weight: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    }],
    validatorTrustScore: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  consensus: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    majorityVote: {
      type: String,
      enum: ['authentic', 'fake', 'suspicious', 'trustworthy', 'untrustworthy', 'inconclusive']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    totalValidators: {
      type: Number,
      default: 0
    },
    weightedScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  aiAssessment: {
    prediction: {
      type: String,
      enum: ['authentic', 'fake', 'suspicious', 'trustworthy', 'untrustworthy']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    reasoning: [String],
    agreementWithCommunity: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  incentives: {
    rewardPool: {
      type: Number,
      default: 0
    },
    distributedRewards: {
      type: Number,
      default: 0
    },
    validatorRewards: [{
      validator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      amount: Number,
      reason: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'disputed', 'cancelled'],
    default: 'active'
  },
  minimumValidators: {
    type: Number,
    default: 5
  },
  expiresAt: {
    type: Date,
    required: true
  },
  metadata: {
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    tags: [String],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Calculate weighted consensus based on validator trust scores
communityValidationSchema.methods.calculateConsensus = function() {
  if (this.validators.length === 0) return;
  
  const votes = {};
  let totalWeight = 0;
  let weightedSum = 0;
  
  // Calculate weighted votes
  this.validators.forEach(validator => {
    const weight = this.calculateValidatorWeight(validator);
    totalWeight += weight;
    
    if (!votes[validator.vote]) {
      votes[validator.vote] = { count: 0, weight: 0 };
    }
    votes[validator.vote].count += 1;
    votes[validator.vote].weight += weight;
    
    // Calculate weighted score (authentic/trustworthy = 100, fake/untrustworthy = 0)
    const voteScore = this.getVoteScore(validator.vote);
    weightedSum += voteScore * weight;
  });
  
  // Find majority vote
  let majorityVote = 'inconclusive';
  let maxWeight = 0;
  
  Object.entries(votes).forEach(([vote, data]) => {
    if (data.weight > maxWeight) {
      maxWeight = data.weight;
      majorityVote = vote;
    }
  });
  
  // Calculate confidence based on agreement
  const majorityPercentage = totalWeight > 0 ? (maxWeight / totalWeight) * 100 : 0;
  
  this.consensus = {
    overallScore: Math.round(weightedSum / Math.max(totalWeight, 1)),
    majorityVote,
    confidence: Math.round(majorityPercentage),
    totalValidators: this.validators.length,
    weightedScore: Math.round(weightedSum / Math.max(totalWeight, 1))
  };
  
  // Check if validation is complete
  if (this.validators.length >= this.minimumValidators && majorityPercentage >= 60) {
    this.status = 'completed';
  }
};

// Calculate validator weight based on trust score and expertise
communityValidationSchema.methods.calculateValidatorWeight = function(validator) {
  let weight = 1;
  
  // Trust score factor (0.5x to 2x multiplier)
  const trustMultiplier = Math.max(0.5, Math.min(2, validator.validatorTrustScore / 50));
  weight *= trustMultiplier;
  
  // Confidence factor
  const confidenceMultiplier = validator.confidence / 100;
  weight *= confidenceMultiplier;
  
  // Evidence factor
  if (validator.evidence && validator.evidence.length > 0) {
    const evidenceBonus = Math.min(0.5, validator.evidence.length * 0.1);
    weight += evidenceBonus;
  }
  
  return Math.max(0.1, Math.min(3, weight)); // Cap between 0.1 and 3
};

// Convert vote to numerical score
communityValidationSchema.methods.getVoteScore = function(vote) {
  const scoreMap = {
    'authentic': 100,
    'trustworthy': 100,
    'suspicious': 30,
    'fake': 0,
    'untrustworthy': 0
  };
  return scoreMap[vote] || 50;
};

// Distribute rewards to validators
communityValidationSchema.methods.distributeRewards = function() {
  if (this.status !== 'completed' || this.incentives.rewardPool === 0) return;
  
  const correctValidators = this.validators.filter(validator => 
    validator.vote === this.consensus.majorityVote
  );
  
  if (correctValidators.length === 0) return;
  
  const rewardPerValidator = this.incentives.rewardPool / correctValidators.length;
  
  correctValidators.forEach(validator => {
    this.incentives.validatorRewards.push({
      validator: validator.validator,
      amount: rewardPerValidator,
      reason: 'Correct consensus vote',
      timestamp: new Date()
    });
  });
  
  this.incentives.distributedRewards = this.incentives.rewardPool;
};

// Check if user can validate this item
communityValidationSchema.methods.canUserValidate = function(userId) {
  // Check if user already validated
  const existingValidation = this.validators.find(v => 
    v.validator.toString() === userId.toString()
  );
  
  if (existingValidation) return { canValidate: false, reason: 'Already validated' };
  
  // Check if validation is still active
  if (this.status !== 'active') return { canValidate: false, reason: 'Validation closed' };
  
  // Check if expired
  if (new Date() > this.expiresAt) return { canValidate: false, reason: 'Validation expired' };
  
  return { canValidate: true };
};

module.exports = mongoose.model('CommunityValidation', communityValidationSchema);
