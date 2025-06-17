const mongoose = require('mongoose');

const reviewAuthenticationSchema = new mongoose.Schema({
  reviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    required: true
  },
  authenticationSteps: [{
    step: {
      type: String,
      enum: ['initial_ai_scan', 'linguistic_analysis', 'behavioral_check', 'community_validation', 'expert_review', 'final_verification'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'requires_manual'],
      default: 'pending'
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    details: {
      type: Object,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: String,
      enum: ['ai_system', 'community', 'expert', 'admin'],
      default: 'ai_system'
    }
  }],
  overallAuthenticationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  credibilityFactors: {
    purchaseVerification: {
      verified: {
        type: Boolean,
        default: false
      },
      verificationMethod: String,
      verificationDate: Date
    },
    reviewerHistory: {
      totalReviews: {
        type: Number,
        default: 0
      },
      averageRating: {
        type: Number,
        default: 0
      },
      reviewConsistency: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
      }
    },
    temporalAnalysis: {
      timeToReview: Number, // Hours after purchase
      reviewingPattern: String,
      seasonalityScore: Number
    },
    contentQuality: {
      detailLevel: {
        type: Number,
        min: 0,
        max: 100
      },
      helpfulnessScore: {
        type: Number,
        min: 0,
        max: 100
      },
      originalityScore: {
        type: Number,
        min: 0,
        max: 100
      }
    }
  },
  verificationWorkflow: {
    currentStage: {
      type: String,
      enum: ['automated_screening', 'community_review', 'expert_validation', 'final_approval', 'completed'],
      default: 'automated_screening'
    },
    workflowHistory: [{
      stage: String,
      action: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      performedBy: String,
      notes: String
    }],
    escalationReasons: [String],
    priorityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  },
  sourceVerification: {
    ipAddress: String,
    deviceFingerprint: String,
    geolocation: {
      country: String,
      city: String,
      coordinates: [Number]
    },
    browserInfo: String,
    sessionData: Object
  },
  fraudIndicators: [{
    indicator: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    description: String,
    detectedAt: {
      type: Date,
      default: Date.now
    }
  }],
  finalDecision: {
    status: {
      type: String,
      enum: ['authentic', 'suspicious', 'fake', 'requires_investigation'],
      default: 'suspicious'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    reasoning: [String],
    decidedBy: String,
    decidedAt: Date,
    appealable: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Calculate overall authentication score
reviewAuthenticationSchema.methods.calculateAuthenticationScore = function() {
  let totalScore = 0;
  let weightedSum = 0;
  
  const stepWeights = {
    'initial_ai_scan': 0.15,
    'linguistic_analysis': 0.20,
    'behavioral_check': 0.15,
    'community_validation': 0.25,
    'expert_review': 0.15,
    'final_verification': 0.10
  };
  
  this.authenticationSteps.forEach(step => {
    if (step.status === 'passed' && step.score) {
      const weight = stepWeights[step.step] || 0.1;
      weightedSum += step.score * weight;
      totalScore += weight;
    }
  });
  
  // Add credibility factors
  const credibilityBonus = this.calculateCredibilityBonus();
  
  this.overallAuthenticationScore = totalScore > 0 ? 
    Math.min(100, (weightedSum / totalScore) * 100 + credibilityBonus) : 0;
  
  return this.overallAuthenticationScore;
};

// Calculate credibility bonus
reviewAuthenticationSchema.methods.calculateCredibilityBonus = function() {
  let bonus = 0;
  
  // Purchase verification bonus
  if (this.credibilityFactors.purchaseVerification.verified) {
    bonus += 10;
  }
  
  // Reviewer history bonus
  const history = this.credibilityFactors.reviewerHistory;
  if (history.totalReviews > 10 && history.reviewConsistency > 70) {
    bonus += 5;
  }
  
  // Content quality bonus
  const quality = this.credibilityFactors.contentQuality;
  if (quality.detailLevel > 80 && quality.originalityScore > 70) {
    bonus += 5;
  }
  
  return Math.min(20, bonus); // Cap bonus at 20 points
};

// Progress to next workflow stage
reviewAuthenticationSchema.methods.progressWorkflow = function(action, performedBy, notes = '') {
  const stageProgression = {
    'automated_screening': 'community_review',
    'community_review': 'expert_validation',
    'expert_validation': 'final_approval',
    'final_approval': 'completed'
  };
  
  // Add to workflow history
  this.verificationWorkflow.workflowHistory.push({
    stage: this.verificationWorkflow.currentStage,
    action,
    timestamp: new Date(),
    performedBy,
    notes
  });
  
  // Progress to next stage
  const nextStage = stageProgression[this.verificationWorkflow.currentStage];
  if (nextStage) {
    this.verificationWorkflow.currentStage = nextStage;
  }
};

// Add fraud indicator
reviewAuthenticationSchema.methods.addFraudIndicator = function(indicator, severity, confidence, description) {
  this.fraudIndicators.push({
    indicator,
    severity,
    confidence,
    description,
    detectedAt: new Date()
  });
  
  // Escalate if critical
  if (severity === 'critical') {
    this.verificationWorkflow.priorityLevel = 'critical';
    this.verificationWorkflow.escalationReasons.push(`Critical fraud indicator: ${indicator}`);
  }
};

module.exports = mongoose.model('ReviewAuthentication', reviewAuthenticationSchema);
