const express = require('express');
const router = express.Router();
const ReviewAuthentication = require('../models/ReviewAuthentication');
const EnhancedReviewAuth = require('../utils/enhancedReviewAuth');
const Review = require('../models/Review');

// Start enhanced authentication for a review
router.post('/authenticate/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const sourceData = req.body;
    
    console.log('🔍 Starting enhanced review authentication...');
    
    const authRecord = await EnhancedReviewAuth.authenticateReview(reviewId, sourceData);
    
    res.json({
      success: true,
      authenticationId: authRecord._id,
      overallScore: authRecord.overallAuthenticationScore,
      status: authRecord.finalDecision.status,
      workflowStage: authRecord.verificationWorkflow.currentStage,
      fraudIndicators: authRecord.fraudIndicators.length,
      message: 'Enhanced authentication completed'
    });
  } catch (error) {
    console.error('Enhanced authentication error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get authentication details for a review
router.get('/details/:reviewId', async (req, res) => {
  try {
    const authRecord = await ReviewAuthentication.findOne({ 
      reviewId: req.params.reviewId 
    }).populate('reviewId');
    
    if (!authRecord) {
      return res.status(404).json({ message: 'Authentication record not found' });
    }
    
    res.json(authRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get authentication summary
router.get('/summary/:reviewId', async (req, res) => {
  try {
    const summary = await EnhancedReviewAuth.getAuthenticationSummary(req.params.reviewId);
    
    if (!summary) {
      return res.status(404).json({ message: 'Authentication summary not found' });
    }
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Progress workflow manually
router.post('/workflow/:authId/progress', async (req, res) => {
  try {
    const { action, performedBy, notes } = req.body;
    
    const authRecord = await ReviewAuthentication.findById(req.params.authId);
    if (!authRecord) {
      return res.status(404).json({ message: 'Authentication record not found' });
    }
    
    authRecord.progressWorkflow(action, performedBy, notes);
    await authRecord.save();
    
    res.json({
      success: true,
      currentStage: authRecord.verificationWorkflow.currentStage,
      message: 'Workflow progressed successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all reviews requiring manual review
router.get('/pending-review', async (req, res) => {
  try {
    const pendingReviews = await ReviewAuthentication.find({
      'verificationWorkflow.currentStage': { $in: ['community_review', 'expert_validation'] },
      'finalDecision.status': { $in: ['suspicious', 'requires_investigation'] }
    }).populate('reviewId');
    
    res.json(pendingReviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk authenticate reviews
router.post('/bulk-authenticate', async (req, res) => {
  try {
    const { reviewIds } = req.body;
    
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ message: 'Invalid review IDs array' });
    }
    
    console.log(`🔍 Starting bulk authentication for ${reviewIds.length} reviews...`);
    
    const results = [];
    
    for (const reviewId of reviewIds) {
      try {
        const authRecord = await EnhancedReviewAuth.authenticateReview(reviewId);
        results.push({
          reviewId,
          success: true,
          score: authRecord.overallAuthenticationScore,
          status: authRecord.finalDecision.status
        });
      } catch (error) {
        results.push({
          reviewId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      processed: reviewIds.length,
      successful,
      failed: reviewIds.length - successful,
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get authentication statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await ReviewAuthentication.aggregate([
      {
        $group: {
          _id: '$finalDecision.status',
          count: { $sum: 1 },
          avgScore: { $avg: '$overallAuthenticationScore' }
        }
      }
    ]);
    
    const workflowStats = await ReviewAuthentication.aggregate([
      {
        $group: {
          _id: '$verificationWorkflow.currentStage',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const fraudStats = await ReviewAuthentication.aggregate([
      { $unwind: '$fraudIndicators' },
      {
        $group: {
          _id: '$fraudIndicators.severity',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      statusStats: stats,
      workflowStats,
      fraudStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update final decision
router.put('/decision/:authId', async (req, res) => {
  try {
    const { status, confidence, reasoning, decidedBy } = req.body;
    
    const authRecord = await ReviewAuthentication.findById(req.params.authId);
    if (!authRecord) {
      return res.status(404).json({ message: 'Authentication record not found' });
    }
    
    authRecord.finalDecision = {
      status,
      confidence,
      reasoning,
      decidedBy,
      decidedAt: new Date(),
      appealable: status !== 'authentic'
    };
    
    authRecord.verificationWorkflow.currentStage = 'completed';
    
    await authRecord.save();
    
    res.json({
      success: true,
      decision: authRecord.finalDecision,
      message: 'Final decision updated successfully'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
