const ReviewAuthentication = require('../models/ReviewAuthentication');
const Review = require('../models/Review');
const User = require('../models/User');
const RealAIAnalyzer = require('./realAIAnalyzer');

class EnhancedReviewAuth {
  
  // Start comprehensive review authentication process
  static async authenticateReview(reviewId, sourceData = {}) {
    try {
      const review = await Review.findById(reviewId).populate('reviewer');
      if (!review) throw new Error('Review not found');
      
      // Create authentication record
      const authRecord = new ReviewAuthentication({
        reviewId,
        sourceVerification: {
          ipAddress: sourceData.ipAddress || 'unknown',
          deviceFingerprint: sourceData.deviceFingerprint || 'unknown',
          geolocation: sourceData.geolocation || {},
          browserInfo: sourceData.browserInfo || 'unknown',
          sessionData: sourceData.sessionData || {}
        }
      });
      
      // Step 1: Initial AI Scan
      await this.performInitialAIScan(authRecord, review);
      
      // Step 2: Linguistic Analysis
      await this.performLinguisticAnalysis(authRecord, review);
      
      // Step 3: Behavioral Check
      await this.performBehavioralCheck(authRecord, review);
      
      // Step 4: Credibility Assessment
      await this.assessCredibilityFactors(authRecord, review);
      
      // Calculate overall score
      authRecord.calculateAuthenticationScore();
      
      // Determine workflow progression
      this.determineWorkflowProgression(authRecord);
      
      await authRecord.save();
      
      console.log(`🔍 Enhanced review authentication completed: ${authRecord.overallAuthenticationScore}%`);
      
      return authRecord;
    } catch (error) {
      console.error('Enhanced review authentication error:', error);
      throw error;
    }
  }
  
  // Step 1: Initial AI Scan
  static async performInitialAIScan(authRecord, review) {
    try {
      const aiAnalyzer = new RealAIAnalyzer();
      const analysis = await aiAnalyzer.analyzeReviewWithHuggingFace(review.content);
      
      const step = {
        step: 'initial_ai_scan',
        score: analysis.authenticityScore,
        details: {
          isAIGenerated: analysis.isAIGenerated,
          confidence: analysis.authenticityScore,
          riskFactors: analysis.detailedAnalysis
        },
        status: analysis.authenticityScore > 60 ? 'passed' : 'failed'
      };
      
      authRecord.authenticationSteps.push(step);
      
      // Add fraud indicators if detected
      if (analysis.isAIGenerated) {
        authRecord.addFraudIndicator(
          'ai_generated_content',
          'high',
          analysis.authenticityScore,
          'Content appears to be AI-generated'
        );
      }
    } catch (error) {
      authRecord.authenticationSteps.push({
        step: 'initial_ai_scan',
        status: 'failed',
        details: { error: error.message }
      });
    }
  }
  
  // Step 2: Linguistic Analysis
  static async performLinguisticAnalysis(authRecord, review) {
    try {
      const analysis = this.analyzeLinguisticPatterns(review.content);
      
      const step = {
        step: 'linguistic_analysis',
        score: analysis.overallScore,
        details: analysis,
        status: analysis.overallScore > 65 ? 'passed' : 'failed'
      };
      
      authRecord.authenticationSteps.push(step);
      
      // Check for suspicious patterns
      if (analysis.suspiciousPatterns.length > 0) {
        analysis.suspiciousPatterns.forEach(pattern => {
          authRecord.addFraudIndicator(
            `linguistic_${pattern.type}`,
            pattern.severity,
            pattern.confidence,
            pattern.description
          );
        });
      }
    } catch (error) {
      authRecord.authenticationSteps.push({
        step: 'linguistic_analysis',
        status: 'failed',
        details: { error: error.message }
      });
    }
  }
  
  // Step 3: Behavioral Check
  static async performBehavioralCheck(authRecord, review) {
    try {
      const user = review.reviewer;
      let behaviorScore = 50; // Base score
      
      // Check user's behavioral data
      if (user.behaviorData && user.behaviorData.typingCadence.length > 0) {
        const aiAnalyzer = new RealAIAnalyzer();
        const behaviorAnalysis = aiAnalyzer.analyzeTypingBehaviorAdvanced(user.behaviorData.typingCadence);
        
        behaviorScore = behaviorAnalysis.classification === 'Human' ? 85 : 
                      behaviorAnalysis.classification === 'Suspicious' ? 40 : 15;
        
        if (behaviorAnalysis.classification === 'Bot') {
          authRecord.addFraudIndicator(
            'bot_behavior',
            'critical',
            behaviorAnalysis.confidence,
            'User exhibits bot-like behavioral patterns'
          );
        }
      }
      
      const step = {
        step: 'behavioral_check',
        score: behaviorScore,
        details: {
          userTrustScore: user.trustScore,
          accountAge: user.accountAge,
          riskLevel: user.riskLevel
        },
        status: behaviorScore > 60 ? 'passed' : 'failed'
      };
      
      authRecord.authenticationSteps.push(step);
    } catch (error) {
      authRecord.authenticationSteps.push({
        step: 'behavioral_check',
        status: 'failed',
        details: { error: error.message }
      });
    }
  }
  
  // Assess credibility factors
  static async assessCredibilityFactors(authRecord, review) {
    try {
      const user = review.reviewer;
      
      // Get user's review history
      const userReviews = await Review.find({ reviewer: user._id });
      
      // Calculate credibility factors
      authRecord.credibilityFactors = {
        purchaseVerification: {
          verified: Math.random() > 0.3, // Simulate purchase verification
          verificationMethod: 'payment_record',
          verificationDate: new Date()
        },
        reviewerHistory: {
          totalReviews: userReviews.length,
          averageRating: userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length || 0,
          reviewConsistency: this.calculateReviewConsistency(userReviews)
        },
        temporalAnalysis: {
          timeToReview: Math.floor(Math.random() * 168), // Random hours (0-7 days)
          reviewingPattern: 'normal',
          seasonalityScore: 75
        },
        contentQuality: {
          detailLevel: this.calculateDetailLevel(review.content),
          helpfulnessScore: Math.floor(Math.random() * 40) + 60, // 60-100
          originalityScore: this.calculateOriginality(review.content)
        }
      };
    } catch (error) {
      console.error('Credibility assessment error:', error);
    }
  }
  
  // Analyze linguistic patterns
  static analyzeLinguisticPatterns(content) {
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const analysis = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: words.length / sentences.length,
      uniqueWords: new Set(words).size,
      lexicalDiversity: new Set(words).size / words.length,
      suspiciousPatterns: [],
      overallScore: 70
    };
    
    // Check for suspicious patterns
    if (analysis.lexicalDiversity < 0.3) {
      analysis.suspiciousPatterns.push({
        type: 'low_diversity',
        severity: 'medium',
        confidence: 75,
        description: 'Unusually low lexical diversity'
      });
      analysis.overallScore -= 15;
    }
    
    // Check for generic phrases
    const genericPhrases = ['good product', 'highly recommend', 'great quality', 'fast shipping'];
    const genericCount = genericPhrases.filter(phrase => content.toLowerCase().includes(phrase)).length;
    
    if (genericCount > 2) {
      analysis.suspiciousPatterns.push({
        type: 'generic_language',
        severity: 'low',
        confidence: 60,
        description: 'Contains multiple generic phrases'
      });
      analysis.overallScore -= 10;
    }
    
    return analysis;
  }
  
  // Calculate review consistency
  static calculateReviewConsistency(reviews) {
    if (reviews.length < 2) return 50;
    
    const ratings = reviews.map(r => r.rating);
    const avgRating = ratings.reduce((a, b) => a + b) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - avgRating, 2), 0) / ratings.length;
    
    // Lower variance = higher consistency
    return Math.max(0, Math.min(100, 100 - (variance * 20)));
  }
  
  // Calculate detail level
  static calculateDetailLevel(content) {
    const words = content.split(/\W+/).filter(w => w.length > 0);
    const detailIndicators = [
      /\d+/, // Numbers
      /color|size|weight|material|texture/gi, // Physical attributes
      /compared|versus|than|better|worse/gi, // Comparisons
      /because|since|due to|reason/gi // Explanations
    ];
    
    let detailScore = Math.min(100, words.length * 2); // Base on length
    
    detailIndicators.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) detailScore += matches.length * 5;
    });
    
    return Math.min(100, detailScore);
  }
  
  // Calculate originality
  static calculateOriginality(content) {
    // Simple originality check based on unique phrases
    const phrases = content.toLowerCase().split(/[.!?]+/);
    const uniquePhrases = new Set(phrases.map(p => p.trim()));
    
    return Math.min(100, (uniquePhrases.size / phrases.length) * 100);
  }
  
  // Determine workflow progression
  static determineWorkflowProgression(authRecord) {
    const score = authRecord.overallAuthenticationScore;
    const criticalIndicators = authRecord.fraudIndicators.filter(i => i.severity === 'critical').length;
    
    if (score > 85 && criticalIndicators === 0) {
      authRecord.verificationWorkflow.currentStage = 'final_approval';
      authRecord.finalDecision = {
        status: 'authentic',
        confidence: score,
        reasoning: ['High authentication score', 'No critical fraud indicators'],
        decidedBy: 'automated_system',
        decidedAt: new Date()
      };
    } else if (score < 40 || criticalIndicators > 0) {
      authRecord.verificationWorkflow.currentStage = 'expert_validation';
      authRecord.verificationWorkflow.priorityLevel = 'high';
      authRecord.finalDecision = {
        status: 'requires_investigation',
        confidence: 100 - score,
        reasoning: ['Low authentication score', 'Critical fraud indicators detected'],
        decidedBy: 'automated_system',
        decidedAt: new Date()
      };
    } else {
      authRecord.verificationWorkflow.currentStage = 'community_review';
      authRecord.finalDecision = {
        status: 'suspicious',
        confidence: Math.abs(50 - score),
        reasoning: ['Moderate authentication score', 'Requires community validation'],
        decidedBy: 'automated_system',
        decidedAt: new Date()
      };
    }
  }
  
  // Get authentication summary
  static async getAuthenticationSummary(reviewId) {
    try {
      const authRecord = await ReviewAuthentication.findOne({ reviewId })
        .populate('reviewId');
      
      if (!authRecord) return null;
      
      return {
        reviewId,
        overallScore: authRecord.overallAuthenticationScore,
        status: authRecord.finalDecision.status,
        confidence: authRecord.finalDecision.confidence,
        workflowStage: authRecord.verificationWorkflow.currentStage,
        fraudIndicators: authRecord.fraudIndicators.length,
        credibilityFactors: authRecord.credibilityFactors,
        completedSteps: authRecord.authenticationSteps.filter(s => s.status === 'passed').length,
        totalSteps: authRecord.authenticationSteps.length
      };
    } catch (error) {
      console.error('Authentication summary error:', error);
      return null;
    }
  }
}

module.exports = EnhancedReviewAuth;
