const User = require('../models/User');
const Review = require('../models/Review');
const { Alert } = require('./alertSystem');

class PredictionAI {
  
  // Generate AI prediction for trust score changes
  static async predictTrustScore(userId, timeframeDays, targetScore) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');
      
      const analysis = await this.analyzeTrustFactors(user);
      const prediction = this.calculateTrustPrediction(analysis, timeframeDays, targetScore);
      
      return {
        prediction: prediction.outcome,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        modelVersion: 'TrustPredict-v1.0',
        factors: analysis
      };
    } catch (error) {
      console.error('Trust prediction error:', error);
      return {
        prediction: 'no',
        confidence: 50,
        reasoning: ['Insufficient data for prediction'],
        modelVersion: 'TrustPredict-v1.0-fallback'
      };
    }
  }
  
  // Analyze factors affecting trust score
  static async analyzeTrustFactors(user) {
    const factors = {
      currentTrustScore: user.trustScore,
      accountAge: user.accountAge,
      transactionCount: user.transactionCount,
      riskLevel: user.riskLevel,
      behavioralConsistency: 0,
      recentActivity: 0,
      alertHistory: 0
    };
    
    // Analyze behavioral consistency
    if (user.behaviorData.typingCadence.length > 0) {
      const variance = this.calculateVariance(user.behaviorData.typingCadence);
      factors.behavioralConsistency = variance > 0 ? Math.min(100, variance / 10) : 0;
    }
    
    // Analyze recent alerts
    try {
      const recentAlerts = await Alert.find({
        target: user._id.toString(),
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      factors.alertHistory = recentAlerts.length;
    } catch (error) {
      factors.alertHistory = 0;
    }
    
    // Calculate recent activity score
    factors.recentActivity = Math.min(100, user.transactionCount / user.accountAge * 10);
    
    return factors;
  }
  
  // Calculate trust score prediction
  static calculateTrustPrediction(factors, timeframeDays, targetScore) {
    let confidence = 50;
    let reasoning = [];
    
    // Current score factor
    const currentGap = targetScore - factors.currentTrustScore;
    const dailyChangeNeeded = currentGap / timeframeDays;
    
    // Positive factors
    if (factors.accountAge > 30) {
      confidence += 10;
      reasoning.push('Established account age increases reliability');
    }
    
    if (factors.transactionCount > 10) {
      confidence += 8;
      reasoning.push('Good transaction history');
    }
    
    if (factors.behavioralConsistency > 50) {
      confidence += 12;
      reasoning.push('Consistent behavioral patterns');
    }
    
    if (factors.riskLevel === 'Low') {
      confidence += 15;
      reasoning.push('Low risk classification');
    }
    
    // Negative factors
    if (factors.alertHistory > 3) {
      confidence -= 20;
      reasoning.push('Multiple recent security alerts');
    }
    
    if (factors.riskLevel === 'High') {
      confidence -= 25;
      reasoning.push('High risk classification');
    }
    
    if (Math.abs(dailyChangeNeeded) > 2) {
      confidence -= 15;
      reasoning.push('Large trust score change required');
    }
    
    // Determine outcome
    const outcome = currentGap <= 0 ? 'yes' : // Already at target
                   confidence > 60 ? 'yes' : 'no';
    
    return {
      outcome,
      confidence: Math.max(10, Math.min(90, confidence)),
      reasoning: reasoning.length > 0 ? reasoning : ['Standard trust analysis applied']
    };
  }
  
  // Predict fraud likelihood
  static async predictFraudLikelihood(userId, timeframeDays) {
    try {
      const user = await User.findById(userId);
      const factors = await this.analyzeTrustFactors(user);
      
      let fraudScore = 0;
      const reasoning = [];
      
      // Risk factors
      if (factors.currentTrustScore < 30) {
        fraudScore += 30;
        reasoning.push('Very low trust score');
      }
      
      if (factors.alertHistory > 2) {
        fraudScore += 25;
        reasoning.push('Multiple security alerts');
      }
      
      if (factors.behavioralConsistency < 20) {
        fraudScore += 20;
        reasoning.push('Suspicious behavioral patterns');
      }
      
      if (factors.accountAge < 7) {
        fraudScore += 15;
        reasoning.push('Very new account');
      }
      
      return {
        prediction: fraudScore > 50 ? 'yes' : 'no',
        confidence: Math.min(90, fraudScore + 10),
        reasoning,
        fraudScore,
        modelVersion: 'FraudPredict-v1.0'
      };
    } catch (error) {
      return {
        prediction: 'no',
        confidence: 50,
        reasoning: ['Insufficient data'],
        modelVersion: 'FraudPredict-v1.0-fallback'
      };
    }
  }
  
  // Generate market suggestions based on AI analysis
  static async generateMarketSuggestions(limit = 5) {
    try {
      const users = await User.find().limit(20).sort({ createdAt: -1 });
      const suggestions = [];
      
      for (const user of users) {
        // Trust score prediction market
        const trustPrediction = await this.predictTrustScore(user._id, 30, 70);
        if (trustPrediction.confidence > 60) {
          suggestions.push({
            type: 'trust_score_prediction',
            targetUser: user._id,
            question: `Will ${user.username}'s trust score reach 70+ in 30 days?`,
            aiPrediction: trustPrediction,
            suggestedOdds: this.calculateSuggestedOdds(trustPrediction.confidence, trustPrediction.prediction)
          });
        }
        
        // Fraud likelihood market
        const fraudPrediction = await this.predictFraudLikelihood(user._id, 14);
        if (fraudPrediction.confidence > 65) {
          suggestions.push({
            type: 'fraud_likelihood',
            targetUser: user._id,
            question: `Will ${user.username} engage in fraudulent activity in 14 days?`,
            aiPrediction: fraudPrediction,
            suggestedOdds: this.calculateSuggestedOdds(fraudPrediction.confidence, fraudPrediction.prediction)
          });
        }
        
        if (suggestions.length >= limit) break;
      }
      
      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Market suggestion error:', error);
      return [];
    }
  }
  
  // Calculate suggested odds based on AI confidence
  static calculateSuggestedOdds(confidence, prediction) {
    const probability = prediction === 'yes' ? confidence / 100 : (100 - confidence) / 100;
    const yesOdds = 1 / Math.max(0.1, probability);
    const noOdds = 1 / Math.max(0.1, (1 - probability));
    
    return {
      yes: Math.round(yesOdds * 100) / 100,
      no: Math.round(noOdds * 100) / 100
    };
  }
  
  // Helper method
  static calculateVariance(data) {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  }
}

module.exports = PredictionAI;