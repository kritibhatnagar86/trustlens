const mongoose = require('mongoose');

const productLifecycleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  currentStage: {
    type: String,
    enum: ['draft', 'pending_approval', 'listed', 'promoted', 'sold', 'delivered', 'reviewed', 'archived'],
    default: 'draft'
  },
  lifecycleEvents: [{
    stage: {
      type: String,
      enum: ['draft', 'pending_approval', 'listed', 'promoted', 'sold', 'delivered', 'reviewed', 'archived'],
      required: true
    },
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: {
      type: Object,
      default: {}
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      location: String
    }
  }],
  performanceMetrics: {
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    inquiries: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    averageTimeToSale: {
      type: Number,
      default: 0
    }
  },
  trustMetrics: {
    authenticityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    sellerTrustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    communityRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    flagCount: {
      type: Number,
      default: 0
    }
  },
  salesData: {
    listedPrice: Number,
    finalPrice: Number,
    discountApplied: Number,
    soldDate: Date,
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentMethod: String,
    shippingMethod: String
  },
  reviewData: {
    totalReviews: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    authenticReviews: {
      type: Number,
      default: 0
    },
    flaggedReviews: {
      type: Number,
      default: 0
    }
  },
  notifications: [{
    type: {
      type: String,
      enum: ['stage_change', 'performance_alert', 'trust_warning', 'review_received'],
      required: true
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }],
  analytics: {
    dailyViews: [{
      date: Date,
      views: Number
    }],
    conversionFunnel: {
      views: Number,
      inquiries: Number,
      negotiations: Number,
      sales: Number
    },
    trustTrend: [{
      date: Date,
      score: Number
    }]
  }
}, {
  timestamps: true
});

// Add lifecycle event
productLifecycleSchema.methods.addEvent = function(stage, action, performedBy, details = {}, metadata = {}) {
  this.lifecycleEvents.push({
    stage,
    action,
    timestamp: new Date(),
    performedBy,
    details,
    metadata
  });
  
  // Update current stage if it's a stage transition
  if (this.currentStage !== stage) {
    this.currentStage = stage;
    
    // Add notification for stage change
    this.notifications.push({
      type: 'stage_change',
      message: `Product moved to ${stage} stage`,
      timestamp: new Date(),
      priority: 'medium'
    });
  }
};

// Update performance metrics
productLifecycleSchema.methods.updateMetrics = function(metric, value) {
  if (this.performanceMetrics.hasOwnProperty(metric)) {
    this.performanceMetrics[metric] = value;
    
    // Calculate conversion rate
    if (metric === 'views' || metric === 'inquiries') {
      this.performanceMetrics.conversionRate = this.performanceMetrics.views > 0 ? 
        (this.performanceMetrics.inquiries / this.performanceMetrics.views) * 100 : 0;
    }
  }
};

// Add daily view tracking
productLifecycleSchema.methods.trackDailyView = function() {
  const today = new Date().toDateString();
  const existingEntry = this.analytics.dailyViews.find(entry => 
    entry.date.toDateString() === today
  );
  
  if (existingEntry) {
    existingEntry.views += 1;
  } else {
    this.analytics.dailyViews.push({
      date: new Date(),
      views: 1
    });
  }
  
  this.performanceMetrics.views += 1;
};

// Update trust metrics
productLifecycleSchema.methods.updateTrustMetrics = function(authenticityScore, sellerTrustScore) {
  this.trustMetrics.authenticityScore = authenticityScore;
  this.trustMetrics.sellerTrustScore = sellerTrustScore;
  
  // Track trust trend
  this.analytics.trustTrend.push({
    date: new Date(),
    score: (authenticityScore + sellerTrustScore) / 2
  });
  
  // Add trust warning if scores are low
  if (authenticityScore < 40 || sellerTrustScore < 40) {
    this.notifications.push({
      type: 'trust_warning',
      message: 'Low trust scores detected - review required',
      timestamp: new Date(),
      priority: 'high'
    });
  }
};

// Complete sale
productLifecycleSchema.methods.completeSale = function(buyerId, finalPrice, paymentMethod, shippingMethod) {
  this.salesData = {
    listedPrice: this.salesData.listedPrice || finalPrice,
    finalPrice,
    discountApplied: this.salesData.listedPrice ? this.salesData.listedPrice - finalPrice : 0,
    soldDate: new Date(),
    buyerId,
    paymentMethod,
    shippingMethod
  };
  
  this.addEvent('sold', 'Sale completed', buyerId, {
    finalPrice,
    paymentMethod,
    shippingMethod
  });
  
  // Calculate time to sale
  const listedEvent = this.lifecycleEvents.find(event => event.stage === 'listed');
  if (listedEvent) {
    this.performanceMetrics.averageTimeToSale = 
      (new Date() - listedEvent.timestamp) / (1000 * 60 * 60 * 24); // Days
  }
};

// Get lifecycle summary
productLifecycleSchema.methods.getSummary = function() {
  return {
    productId: this.productId,
    currentStage: this.currentStage,
    totalEvents: this.lifecycleEvents.length,
    performanceMetrics: this.performanceMetrics,
    trustMetrics: this.trustMetrics,
    unreadNotifications: this.notifications.filter(n => !n.read).length,
    daysListed: this.lifecycleEvents.find(e => e.stage === 'listed') ? 
      Math.floor((new Date() - this.lifecycleEvents.find(e => e.stage === 'listed').timestamp) / (1000 * 60 * 60 * 24)) : 0
  };
};

module.exports = mongoose.model('ProductLifecycle', productLifecycleSchema);
