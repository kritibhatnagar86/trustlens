// Real-time Alert System for TRUSTLENS
const mongoose = require('mongoose');

// Alert Schema
const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Suspicious Typing Pattern', 'Fake Review Detection', 'Rapid Activity', 'Trust Score Drop', 'Bot Behavior']
  },
  target: {
    type: String,
    required: true // User ID or Product ID
  },
  targetType: {
    type: String,
    enum: ['User', 'Product', 'Review'],
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  status: {
    type: String,
    enum: ['Active', 'Resolved', 'Dismissed'],
    default: 'Active'
  },
  actions: [{
    type: String,
    enum: ['Flag Account', 'Remove Content', 'Manual Review', 'Temporary Suspension']
  }]
}, {
  timestamps: true
});

const Alert = mongoose.model('Alert', alertSchema);

class AlertSystem {
  
  // Create a new alert
  static async createAlert(alertData) {
    try {
      const alert = new Alert(alertData);
      await alert.save();
      console.log(`🚨 ALERT CREATED: ${alert.type} - ${alert.severity}`);
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }
  
  // Check for suspicious user behavior and create alerts
  static async checkUserBehavior(user) {
    const alerts = [];
    
    // Check for bot-like typing patterns
    if (user.behaviorData.typingCadence.length > 0) {
      const variance = this.calculateTypingVariance(user.behaviorData.typingCadence);
      if (variance < 50) { // Too consistent = bot
        const alert = await this.createAlert({
          type: 'Suspicious Typing Pattern',
          target: user._id.toString(),
          targetType: 'User',
          severity: 'High',
          description: `User ${user.username} shows bot-like typing patterns with variance: ${variance}`,
          data: { variance, typingCadence: user.behaviorData.typingCadence },
          actions: ['Flag Account', 'Manual Review']
        });
        if (alert) alerts.push(alert);
      }
    }
    
    // Check for rapid activity on new accounts
    if (user.accountAge < 7 && user.transactionCount > 10) {
      const alert = await this.createAlert({
        type: 'Rapid Activity',
        target: user._id.toString(),
        targetType: 'User',
        severity: 'Medium',
        description: `New account ${user.username} has high transaction volume (${user.transactionCount} transactions in ${user.accountAge} days)`,
        data: { accountAge: user.accountAge, transactionCount: user.transactionCount },
        actions: ['Manual Review']
      });
      if (alert) alerts.push(alert);
    }
    
    // Check for low trust score
    if (user.trustScore < 30) {
      const alert = await this.createAlert({
        type: 'Trust Score Drop',
        target: user._id.toString(),
        targetType: 'User',
        severity: 'High',
        description: `User ${user.username} has critically low trust score: ${user.trustScore}`,
        data: { trustScore: user.trustScore },
        actions: ['Flag Account', 'Temporary Suspension']
      });
      if (alert) alerts.push(alert);
    }
    
    return alerts;
  }
  
  // Check for fake reviews and create alerts
  static async checkReviewAuthenticity(review) {
    const alerts = [];
    
    if (review.authenticityScore < 60) {
      const alert = await this.createAlert({
        type: 'Fake Review Detection',
        target: review._id.toString(),
        targetType: 'Review',
        severity: review.authenticityScore < 40 ? 'Critical' : 'High',
        description: `Review has low authenticity score: ${review.authenticityScore}% (AI Generated: ${review.isAIGenerated})`,
        data: { 
          authenticityScore: review.authenticityScore,
          isAIGenerated: review.isAIGenerated,
          linguisticAnalysis: review.linguisticAnalysis
        },
        actions: ['Remove Content', 'Flag Account']
      });
      if (alert) alerts.push(alert);
    }
    
    return alerts;
  }
  
  // Get all active alerts
  static async getActiveAlerts() {
    try {
      return await Alert.find({ status: 'Active' }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }
  
  // Resolve an alert
  static async resolveAlert(alertId) {
    try {
      return await Alert.findByIdAndUpdate(alertId, { status: 'Resolved' }, { new: true });
    } catch (error) {
      console.error('Error resolving alert:', error);
      return null;
    }
  }
  
  // Helper function to calculate typing variance
  static calculateTypingVariance(typingData) {
    if (typingData.length < 2) return 100;
    const mean = typingData.reduce((a, b) => a + b) / typingData.length;
    const variance = typingData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / typingData.length;
    return Math.round(variance);
  }
}

module.exports = { AlertSystem, Alert };
