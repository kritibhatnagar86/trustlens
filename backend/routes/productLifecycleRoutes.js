const express = require('express');
const router = express.Router();
const ProductLifecycleManager = require('../utils/productLifecycleManager');
const ProductLifecycle = require('../models/ProductLifecycle');

// Initialize lifecycle for a product
router.post('/initialize', async (req, res) => {
  try {
    const { productId, sellerId, initialPrice } = req.body;
    
    const lifecycle = await ProductLifecycleManager.initializeProductLifecycle(
      productId, 
      sellerId, 
      initialPrice
    );
    
    res.status(201).json({
      success: true,
      lifecycle: lifecycle.getSummary(),
      message: 'Product lifecycle initialized'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Progress product stage
router.post('/progress', async (req, res) => {
  try {
    const { productId, newStage, performedBy, details } = req.body;
    
    const lifecycle = await ProductLifecycleManager.progressStage(
      productId, 
      newStage, 
      performedBy, 
      details
    );
    
    res.json({
      success: true,
      currentStage: lifecycle.currentStage,
      summary: lifecycle.getSummary(),
      message: `Product progressed to ${newStage}`
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Track product view
router.post('/track-view', async (req, res) => {
  try {
    const { productId, viewerId } = req.body;
    
    const lifecycle = await ProductLifecycleManager.trackView(productId, viewerId);
    
    if (!lifecycle) {
      return res.status(404).json({ message: 'Product lifecycle not found' });
    }
    
    res.json({
      success: true,
      views: lifecycle.performanceMetrics.views,
      message: 'View tracked successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Track inquiry
router.post('/track-inquiry', async (req, res) => {
  try {
    const { productId, inquirerId, inquiryType } = req.body;
    
    const lifecycle = await ProductLifecycleManager.trackInquiry(
      productId, 
      inquirerId, 
      inquiryType
    );
    
    if (!lifecycle) {
      return res.status(404).json({ message: 'Product lifecycle not found' });
    }
    
    res.json({
      success: true,
      inquiries: lifecycle.performanceMetrics.inquiries,
      conversionRate: lifecycle.performanceMetrics.conversionRate,
      message: 'Inquiry tracked successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Complete sale
router.post('/complete-sale', async (req, res) => {
  try {
    const { productId, buyerId, finalPrice, paymentMethod, shippingMethod } = req.body;
    
    const lifecycle = await ProductLifecycleManager.completeSale(
      productId, 
      buyerId, 
      finalPrice, 
      paymentMethod, 
      shippingMethod
    );
    
    res.json({
      success: true,
      salesData: lifecycle.salesData,
      summary: lifecycle.getSummary(),
      message: 'Sale completed successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add review
router.post('/add-review', async (req, res) => {
  try {
    const { productId, reviewerId, rating, reviewContent } = req.body;
    
    const lifecycle = await ProductLifecycleManager.addReview(
      productId, 
      reviewerId, 
      rating, 
      reviewContent
    );
    
    if (!lifecycle) {
      return res.status(404).json({ message: 'Product lifecycle not found' });
    }
    
    res.json({
      success: true,
      reviewData: lifecycle.reviewData,
      message: 'Review added to lifecycle'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get product analytics
router.get('/analytics/:productId', async (req, res) => {
  try {
    const analytics = await ProductLifecycleManager.getAnalytics(req.params.productId);
    
    if (!analytics) {
      return res.status(404).json({ message: 'Product lifecycle not found' });
    }
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bulk summary
router.post('/bulk-summary', async (req, res) => {
  try {
    const { productIds } = req.body;
    
    const summaries = await ProductLifecycleManager.getBulkSummary(productIds);
    
    res.json({
      success: true,
      count: summaries.length,
      summaries
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get performance insights for seller
router.get('/insights/:sellerId', async (req, res) => {
  try {
    const insights = await ProductLifecycleManager.getPerformanceInsights(req.params.sellerId);
    
    if (!insights) {
      return res.status(404).json({ message: 'No insights available' });
    }
    
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notifications as read
router.put('/notifications/:productId/read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    const success = await ProductLifecycleManager.markNotificationsRead(
      req.params.productId, 
      notificationIds
    );
    
    if (!success) {
      return res.status(404).json({ message: 'Product lifecycle not found' });
    }
    
    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get lifecycle timeline
router.get('/timeline/:productId', async (req, res) => {
  try {
    const lifecycle = await ProductLifecycle.findOne({ 
      productId: req.params.productId 
    }).populate('lifecycleEvents.performedBy', 'username');
    
    if (!lifecycle) {
      return res.status(404).json({ message: 'Product lifecycle not found' });
    }
    
    const timeline = lifecycle.lifecycleEvents
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(event => ({
        stage: event.stage,
        action: event.action,
        timestamp: event.timestamp,
        performedBy: event.performedBy?.username || 'System',
        details: event.details
      }));
    
    res.json({
      productId: req.params.productId,
      currentStage: lifecycle.currentStage,
      timeline
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
