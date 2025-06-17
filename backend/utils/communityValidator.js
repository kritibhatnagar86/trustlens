const CommunityValidation = require('../models/CommunityValidation');
const User = require('../models/User');
const Review = require('../models/Review');
const Product = require('../models/Product');
const RealAIAnalyzer = require('./realAIAnalyzer');

class CommunityValidator {
  
  // Create validation request for community assessment
  static async createValidationRequest(targetType, targetId, validationType, options = {}) {
    try {
      const question = this.generateValidationQuestion(targetType, validationType);
      const expiresAt = new Date(Date.now() + (options.durationHours || 24) * 60 * 60 * 1000);
      
      // Get AI assessment for comparison
      const aiAssessment = await this.getAIAssessment(targetType, targetId, validationType);
      
      const validation = new CommunityValidation({
        targetType,
        targetId,
        targetModel: this.getTargetModel(targetType),
        validationType,
        question,
        expiresAt,
        aiAssessment,
        minimumValidators: options.minimumValidators || 5,
        incentives: {
          rewardPool: options.rewardPool || 50
        },
        metadata: {
          priority: options.priority || 'medium',
          difficulty: options.difficulty || 'medium',
          tags: options.tags || []
        }
      });
      
      await validation.save();
      console.log(`🏛️ Created community validation: ${question}`);
      
      return validation;
    } catch (error) {
      console.error('Error creating validation request:', error);
      throw error;
    }
  }
  
  // Submit validation vote
  static async submitValidation(validationId, validatorId, vote, confidence, reasoning, evidence = []) {
    try {
      const validation = await CommunityValidation.findById(validationId);
      if (!validation) throw new Error('Validation not found');
      
      const validator = await User.findById(validatorId);
      if (!validator) throw new Error('Validator not found');
      
      // Check if user can validate
      const canValidate = validation.canUserValidate(validatorId);
      if (!canValidate.canValidate) {
        throw new Error(canValidate.reason);
      }
      
      // Add validation vote
      validation.validators.push({
        validator: validatorId,
        vote,
        confidence,
        reasoning,
        evidence,
        validatorTrustScore: validator.trustScore,
        timestamp: new Date()
      });
      
      // Recalculate consensus
      validation.calculateConsensus();
      
      // Distribute rewards if completed
      if (validation.status === 'completed') {
        validation.distributeRewards();
      }
      
      await validation.save();
      
      console.log(`✅ Validation submitted: ${vote} (${confidence}% confidence)`);
      
      return validation;
    } catch (error) {
      console.error('Error submitting validation:', error);
      throw error;
    }
  }
  
  // Get active validations for a user to participate in
  static async getValidationsForUser(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user) return [];
      
      const validations = await CommunityValidation.find({
        status: 'active',
        expiresAt: { $gt: new Date() },
        'validators.validator': { $ne: userId }
      })
      .populate('targetId')
      .sort({ 'metadata.priority': -1, createdAt: -1 })
      .limit(limit);
      
      // Filter based on user's trust score (higher trust users get harder validations)
      return validations.filter(validation => {
        const difficultyThreshold = {
          'easy': 0,
          'medium': 50,
          'hard': 70,
          'expert': 85
        };
        
        return user.trustScore >= difficultyThreshold[validation.metadata.difficulty];
      });
    } catch (error) {
      console.error('Error getting validations for user:', error);
      return [];
    }
  }
  
  // Get AI assessment for comparison
  static async getAIAssessment(targetType, targetId, validationType) {
    try {
      const aiAnalyzer = new RealAIAnalyzer();
      
      if (targetType === 'review' && validationType === 'authenticity') {
        const review = await Review.findById(targetId);
        if (review) {
          const analysis = await aiAnalyzer.analyzeReviewWithHuggingFace(review.content);
          return {
            prediction: analysis.isAIGenerated ? 'fake' : 'authentic',
            confidence: analysis.authenticityScore,
            reasoning: analysis.detailedAnalysis ? Object.values(analysis.detailedAnalysis) : []
          };
        }
      } else if (targetType === 'user' && validationType === 'trust_verification') {
        const user = await User.findById(targetId);
        if (user && user.behaviorData.typingCadence.length > 0) {
          const analysis = aiAnalyzer.analyzeTypingBehaviorAdvanced(user.behaviorData.typingCadence);
          return {
            prediction: analysis.classification === 'Human' ? 'trustworthy' : 'untrustworthy',
            confidence: analysis.confidence,
            reasoning: analysis.analysis.riskFactors || []
          };
        }
      }
      
      return {
        prediction: 'suspicious',
        confidence: 50,
        reasoning: ['Insufficient data for AI assessment']
      };
    } catch (error) {
      console.error('AI assessment error:', error);
      return {
        prediction: 'suspicious',
        confidence: 50,
        reasoning: ['AI assessment failed']
      };
    }
  }
  
  // Generate validation question based on type
  static generateValidationQuestion(targetType, validationType) {
    const questions = {
      'review_authenticity': 'Is this review written by a real human customer?',
      'review_quality_assessment': 'Is this review helpful and informative?',
      'user_trust_verification': 'Is this user account operated by a real human?',
      'user_fraud_detection': 'Does this user show signs of fraudulent behavior?',
      'product_authenticity': 'Is this product listing legitimate and accurate?',
      'image_authenticity': 'Is this image authentic and unmanipulated?'
    };
    
    const key = `${targetType}_${validationType}`;
    return questions[key] || `Please assess the ${validationType} of this ${targetType}`;
  }
  
  // Get target model for population
  static getTargetModel(targetType) {
    const modelMap = {
      'user': 'User',
      'review': 'Review',
      'product': 'Product'
    };
    return modelMap[targetType] || 'User';
  }
  
  // Auto-create validations for suspicious content
  static async autoCreateValidations() {
    try {
      const created = [];
      
      // Find suspicious reviews (low authenticity score)
      const suspiciousReviews = await Review.find({
        authenticityScore: { $lt: 60 },
        status: 'Active'
      }).limit(5);
      
      for (const review of suspiciousReviews) {
        // Check if validation already exists
        const existing = await CommunityValidation.findOne({
          targetType: 'review',
          targetId: review._id,
          status: { $in: ['active', 'completed'] }
        });
        
        if (!existing) {
          const validation = await this.createValidationRequest(
            'review',
            review._id,
            'authenticity',
            { priority: 'high', rewardPool: 75 }
          );
          created.push(validation);
        }
      }
      
      // Find suspicious users (low trust score)
      const suspiciousUsers = await User.find({
        trustScore: { $lt: 40 },
        riskLevel: 'High'
      }).limit(3);
      
      for (const user of suspiciousUsers) {
        const existing = await CommunityValidation.findOne({
          targetType: 'user',
          targetId: user._id,
          status: { $in: ['active', 'completed'] }
        });
        
        if (!existing) {
          const validation = await this.createValidationRequest(
            'user',
            user._id,
            'trust_verification',
            { priority: 'high', rewardPool: 100 }
          );
          created.push(validation);
        }
      }
      
      console.log(`🤖 Auto-created ${created.length} community validations`);
      return created;
    } catch (error) {
      console.error('Auto-create validations error:', error);
      return [];
    }
  }
  
  // Get validation statistics
  static async getValidationStats() {
    try {
      const stats = await CommunityValidation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgValidators: { $avg: '$consensus.totalValidators' },
            avgConfidence: { $avg: '$consensus.confidence' }
          }
        }
      ]);
      
      const typeStats = await CommunityValidation.aggregate([
        {
          $group: {
            _id: '$validationType',
            count: { $sum: 1 },
            avgScore: { $avg: '$consensus.overallScore' }
          }
        }
      ]);
      
      const rewardStats = await CommunityValidation.aggregate([
        {
          $group: {
            _id: null,
            totalRewards: { $sum: '$incentives.distributedRewards' },
            avgReward: { $avg: '$incentives.distributedRewards' }
          }
        }
      ]);
      
      return {
        statusStats: stats,
        typeStats,
        rewardStats: rewardStats[0] || { totalRewards: 0, avgReward: 0 }
      };
    } catch (error) {
      console.error('Validation stats error:', error);
      return { statusStats: [], typeStats: [], rewardStats: {} };
    }
  }
}

module.exports = CommunityValidator;
