const ProductLifecycle = require('../models/ProductLifecycle');
const Product = require('../models/Product');
const User = require('../models/User');

class ProductLifecycleManager {
  
  // Initialize lifecycle for a new product
  static async initializeProductLifecycle(productId, sellerId, initialPrice) {
    try {
      const lifecycle = new ProductLifecycle({
        productId,
        currentStage: 'draft',
        salesData: {
          listedPrice: initialPrice
        },
        performanceMetrics: {
          views: 0,
          favorites: 0,
          inquiries: 0,
          conversionRate: 0
        }
      });
      
      // Add initial event
      lifecycle.addEvent('draft', 'Product created', sellerId, {
        initialPrice,
        createdAt: new Date()
      });
      
      await lifecycle.save();
      
      console.log(`🔄 Product lifecycle initialized for product: ${productId}`);
      
      return lifecycle;
    } catch (error) {
      console.error('Lifecycle initialization error:', error);
      throw error;
    }
  }
  
  // Progress product through lifecycle stages
  static async progressStage(productId, newStage, performedBy, details = {}) {
    try {
      let lifecycle = await ProductLifecycle.findOne({ productId });
      
      if (!lifecycle) {
        // Create lifecycle if it doesn't exist
        lifecycle = await this.initializeProductLifecycle(productId, performedBy, 0);
      }
      
      const stageActions = {
        'pending_approval': 'Submitted for approval',
        'listed': 'Listed for sale',
        'promoted': 'Promoted listing',
        'sold': 'Marked as sold',
        'delivered': 'Delivery confirmed',
        'reviewed': 'Review received',
        'archived': 'Archived product'
      };
      
      const action = stageActions[newStage] || `Moved to ${newStage}`;
      
      lifecycle.addEvent(newStage, action, performedBy, details);
      
      // Update trust metrics if seller info available
      const seller = await User.findById(performedBy);
      if (seller) {
        lifecycle.updateTrustMetrics(
          lifecycle.trustMetrics.authenticityScore,
          seller.trustScore
        );
      }
      
      await lifecycle.save();
      
      console.log(`🔄 Product ${productId} progressed to ${newStage}`);
      
      return lifecycle;
    } catch (error) {
      console.error('Stage progression error:', error);
      throw error;
    }
  }
  
  // Track product view
  static async trackView(productId, viewerId = null) {
    try {
      let lifecycle = await ProductLifecycle.findOne({ productId });
      
      if (!lifecycle) {
        return null;
      }
      
      lifecycle.trackDailyView();
      
      // Add view event
      lifecycle.addEvent(lifecycle.currentStage, 'Product viewed', viewerId, {
        timestamp: new Date(),
        viewType: 'page_view'
      });
      
      await lifecycle.save();
      
      return lifecycle;
    } catch (error) {
      console.error('View tracking error:', error);
      return null;
    }
  }
  
  // Track inquiry
  static async trackInquiry(productId, inquirerId, inquiryType = 'general') {
    try {
      const lifecycle = await ProductLifecycle.findOne({ productId });
      
      if (!lifecycle) {
        return null;
      }
      
      lifecycle.updateMetrics('inquiries', lifecycle.performanceMetrics.inquiries + 1);
      
      lifecycle.addEvent(lifecycle.currentStage, 'Inquiry received', inquirerId, {
        inquiryType,
        timestamp: new Date()
      });
      
      await lifecycle.save();
      
      return lifecycle;
    } catch (error) {
      console.error('Inquiry tracking error:', error);
      return null;
    }
  }
  
  // Complete product sale
  static async completeSale(productId, buyerId, finalPrice, paymentMethod = 'unknown', shippingMethod = 'standard') {
    try {
      const lifecycle = await ProductLifecycle.findOne({ productId });
      
      if (!lifecycle) {
        throw new Error('Product lifecycle not found');
      }
      
      lifecycle.completeSale(buyerId, finalPrice, paymentMethod, shippingMethod);
      
      // Update conversion funnel
      lifecycle.analytics.conversionFunnel = {
        views: lifecycle.performanceMetrics.views,
        inquiries: lifecycle.performanceMetrics.inquiries,
        negotiations: lifecycle.analytics.conversionFunnel.negotiations || 0,
        sales: 1
      };
      
      await lifecycle.save();
      
      console.log(`💰 Sale completed for product ${productId}: $${finalPrice}`);
      
      return lifecycle;
    } catch (error) {
      console.error('Sale completion error:', error);
      throw error;
    }
  }
  
  // Add review to product lifecycle
  static async addReview(productId, reviewerId, rating, reviewContent) {
    try {
      const lifecycle = await ProductLifecycle.findOne({ productId });
      
      if (!lifecycle) {
        return null;
      }
      
      // Update review data
      lifecycle.reviewData.totalReviews += 1;
      lifecycle.reviewData.averageRating = 
        ((lifecycle.reviewData.averageRating * (lifecycle.reviewData.totalReviews - 1)) + rating) / 
        lifecycle.reviewData.totalReviews;
      
      lifecycle.addEvent('reviewed', 'Review added', reviewerId, {
        rating,
        reviewLength: reviewContent.length,
        timestamp: new Date()
      });
      
      // Add notification
      lifecycle.notifications.push({
        type: 'review_received',
        message: `New ${rating}-star review received`,
        timestamp: new Date(),
        priority: rating <= 2 ? 'high' : 'medium'
      });
      
      await lifecycle.save();
      
      return lifecycle;
    } catch (error) {
      console.error('Review addition error:', error);
      return null;
    }
  }
  
  // Get lifecycle analytics
  static async getAnalytics(productId) {
    try {
      const lifecycle = await ProductLifecycle.findOne({ productId })
        .populate('productId', 'name price category')
        .populate('salesData.buyerId', 'username email');
      
      if (!lifecycle) {
        return null;
      }
      
      const analytics = {
        summary: lifecycle.getSummary(),
        timeline: lifecycle.lifecycleEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        performance: {
          ...lifecycle.performanceMetrics,
          dailyViews: lifecycle.analytics.dailyViews.slice(-30), // Last 30 days
          conversionFunnel: lifecycle.analytics.conversionFunnel
        },
        trust: {
          ...lifecycle.trustMetrics,
          trustTrend: lifecycle.analytics.trustTrend.slice(-10) // Last 10 entries
        },
        notifications: lifecycle.notifications.filter(n => !n.read).slice(0, 5) // Recent unread
      };
      
      return analytics;
    } catch (error) {
      console.error('Analytics retrieval error:', error);
      return null;
    }
  }
  
  // Get lifecycle summary for multiple products
  static async getBulkSummary(productIds) {
    try {
      const lifecycles = await ProductLifecycle.find({ 
        productId: { $in: productIds } 
      }).populate('productId', 'name price category');
      
      return lifecycles.map(lifecycle => ({
        ...lifecycle.getSummary(),
        productInfo: lifecycle.productId
      }));
    } catch (error) {
      console.error('Bulk summary error:', error);
      return [];
    }
  }
  
  // Get performance insights
  static async getPerformanceInsights(sellerId) {
    try {
      // Get all products for seller
      const sellerProducts = await Product.find({ seller: sellerId });
      const productIds = sellerProducts.map(p => p._id);
      
      const lifecycles = await ProductLifecycle.find({ 
        productId: { $in: productIds } 
      });
      
      const insights = {
        totalProducts: lifecycles.length,
        averageViews: 0,
        averageConversionRate: 0,
        averageTrustScore: 0,
        stageDistribution: {},
        topPerformers: [],
        needsAttention: []
      };
      
      if (lifecycles.length > 0) {
        // Calculate averages
        insights.averageViews = lifecycles.reduce((sum, l) => sum + l.performanceMetrics.views, 0) / lifecycles.length;
        insights.averageConversionRate = lifecycles.reduce((sum, l) => sum + l.performanceMetrics.conversionRate, 0) / lifecycles.length;
        insights.averageTrustScore = lifecycles.reduce((sum, l) => sum + l.trustMetrics.authenticityScore, 0) / lifecycles.length;
        
        // Stage distribution
        lifecycles.forEach(lifecycle => {
          insights.stageDistribution[lifecycle.currentStage] = 
            (insights.stageDistribution[lifecycle.currentStage] || 0) + 1;
        });
        
        // Top performers (high views and conversion)
        insights.topPerformers = lifecycles
          .filter(l => l.performanceMetrics.views > insights.averageViews)
          .sort((a, b) => b.performanceMetrics.conversionRate - a.performanceMetrics.conversionRate)
          .slice(0, 5)
          .map(l => l.getSummary());
        
        // Needs attention (low trust or high flags)
        insights.needsAttention = lifecycles
          .filter(l => l.trustMetrics.authenticityScore < 50 || l.trustMetrics.flagCount > 0)
          .map(l => l.getSummary());
      }
      
      return insights;
    } catch (error) {
      console.error('Performance insights error:', error);
      return null;
    }
  }
  
  // Mark notifications as read
  static async markNotificationsRead(productId, notificationIds = []) {
    try {
      const lifecycle = await ProductLifecycle.findOne({ productId });
      
      if (!lifecycle) {
        return false;
      }
      
      if (notificationIds.length === 0) {
        // Mark all as read
        lifecycle.notifications.forEach(notification => {
          notification.read = true;
        });
      } else {
        // Mark specific notifications as read
        lifecycle.notifications.forEach(notification => {
          if (notificationIds.includes(notification._id.toString())) {
            notification.read = true;
          }
        });
      }
      
      await lifecycle.save();
      
      return true;
    } catch (error) {
      console.error('Mark notifications read error:', error);
      return false;
    }
  }
}

module.exports = ProductLifecycleManager;
