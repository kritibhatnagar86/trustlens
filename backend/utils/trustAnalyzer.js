// Trust Analyzer - Core AI Engine for TRUSTLENS
class TrustAnalyzer {
  
  // Calculate user trust score based on behavioral data
  static calculateTrustScore(user) {
    let score = 50; // Base score
    
    // Account age factor (older accounts are more trusted)
    const ageBonus = Math.min(user.accountAge * 2, 20);
    score += ageBonus;
    
    // Transaction history factor
    const transactionBonus = Math.min(user.transactionCount * 0.5, 15);
    score += transactionBonus;
    
    // Behavioral consistency check
    if (user.behaviorData.typingCadence.length > 0) {
      const consistency = this.analyzeTypingConsistency(user.behaviorData.typingCadence);
      score += consistency * 10;
    }
    
    // Risk level adjustment
    switch (user.riskLevel) {
      case 'Low':
        score += 10;
        break;
      case 'High':
        score -= 15;
        break;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Analyze typing cadence for bot detection
  static analyzeTypingConsistency(typingData) {
    if (typingData.length < 5) return 0;
    
    // Calculate variance in typing speed
    const mean = typingData.reduce((a, b) => a + b) / typingData.length;
    const variance = typingData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / typingData.length;
    
    // Human typing has natural variance, bots are too consistent
    const humanVariance = variance > 100 && variance < 10000;
    return humanVariance ? 1 : -1;
  }
  
  // Detect suspicious patterns
  static detectSuspiciousActivity(user) {
    const alerts = [];
    
    // Check for bot-like typing patterns
    if (user.behaviorData.typingCadence.length > 0) {
      const consistency = this.analyzeTypingConsistency(user.behaviorData.typingCadence);
      if (consistency < 0) {
        alerts.push({
          type: 'Suspicious Typing Pattern',
          severity: 'High',
          description: 'Typing pattern suggests automated behavior'
        });
      }
    }
    
    // Check for rapid account creation and high activity
    if (user.accountAge < 7 && user.transactionCount > 10) {
      alerts.push({
        type: 'Rapid Activity',
        severity: 'Medium',
        description: 'High transaction volume for new account'
      });
    }
    
    return alerts;
  }
}

module.exports = TrustAnalyzer;
