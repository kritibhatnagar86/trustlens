const express = require('express');
const router = express.Router();
const CommunityValidation = require('../models/CommunityValidation');
const CommunityValidator = require('../utils/communityValidator');

// Get all active validations
router.get('/', async (req, res) => {
  try {
    const validations = await CommunityValidation.find({ status: 'active' })
      .populate('targetId')
      .populate('validators.validator', 'username trustScore')
      .sort({ 'metadata.priority': -1, createdAt: -1 });
    res.json(validations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get validations for a specific user to participate in
router.get('/user/:userId/available', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const validations = await CommunityValidator.getValidationsForUser(req.params.userId, limit);
    res.json(validations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new community validation request
router.post('/', async (req, res) => {
  try {
    const { targetType, targetId, validationType, options } = req.body;
    
    console.log('🏛️ Creating community validation request...');
    
    const validation = await CommunityValidator.createValidationRequest(
      targetType,
      targetId,
      validationType,
      options
    );
    
    res.status(201).json(validation);
  } catch (error) {
    console.error('Community validation creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Submit validation vote
router.post('/:id/validate', async (req, res) => {
  try {
    const { validatorId, vote, confidence, reasoning, evidence } = req.body;
    
    console.log(`🗳️ Submitting validation vote: ${vote}`);
    
    const validation = await CommunityValidator.submitValidation(
      req.params.id,
      validatorId,
      vote,
      confidence,
      reasoning,
      evidence
    );
    
    res.json({
      success: true,
      validation,
      consensus: validation.consensus,
      rewardEarned: validation.status === 'completed' && 
                   validation.validators.find(v => v.validator.toString() === validatorId)?.vote === validation.consensus.majorityVote
    });
  } catch (error) {
    console.error('Validation submission error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get validation by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const validation = await CommunityValidation.findById(req.params.id)
      .populate('targetId')
      .populate('validators.validator', 'username trustScore')
      .populate('incentives.validatorRewards.validator', 'username');
    
    if (!validation) {
      return res.status(404).json({ message: 'Validation not found' });
    }
    
    res.json(validation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auto-create validations for suspicious content
router.post('/auto-create', async (req, res) => {
  try {
    console.log('🤖 Auto-creating community validations...');
    
    const created = await CommunityValidator.autoCreateValidations();
    
    res.json({
      success: true,
      created: created.length,
      validations: created
    });
  } catch (error) {
    console.error('Auto-create error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get validation statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await CommunityValidator.getValidationStats();
    
    // Additional real-time stats
    const activeCount = await CommunityValidation.countDocuments({ status: 'active' });
    const completedCount = await CommunityValidation.countDocuments({ status: 'completed' });
    const totalValidators = await CommunityValidation.aggregate([
      { $unwind: '$validators' },
      { $group: { _id: '$validators.validator' } },
      { $count: 'uniqueValidators' }
    ]);
    
    res.json({
      ...stats,
      realTimeStats: {
        activeValidations: activeCount,
        completedValidations: completedCount,
        uniqueValidators: totalValidators[0]?.uniqueValidators || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's validation history
router.get('/user/:userId/history', async (req, res) => {
  try {
    const validations = await CommunityValidation.find({
      'validators.validator': req.params.userId
    })
    .populate('targetId')
    .sort({ createdAt: -1 });
    
    const userValidations = [];
    validations.forEach(validation => {
      const userValidation = validation.validators.find(
        v => v.validator.toString() === req.params.userId
      );
      if (userValidation) {
        userValidations.push({
          validationId: validation._id,
          question: validation.question,
          targetType: validation.targetType,
          userVote: userValidation.vote,
          userConfidence: userValidation.confidence,
          consensus: validation.consensus,
          wasCorrect: userValidation.vote === validation.consensus.majorityVote,
          reward: validation.incentives.validatorRewards.find(
            r => r.validator.toString() === req.params.userId
          )?.amount || 0,
          timestamp: userValidation.timestamp,
          status: validation.status
        });
      }
    });
    
    res.json(userValidations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboard of top validators
router.get('/leaderboard/validators', async (req, res) => {
  try {
    const leaderboard = await CommunityValidation.aggregate([
      { $unwind: '$validators' },
      {
        $group: {
          _id: '$validators.validator',
          totalValidations: { $sum: 1 },
          avgConfidence: { $avg: '$validators.confidence' },
          totalRewards: { $sum: { $ifNull: ['$validators.reward', 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          trustScore: '$user.trustScore',
          totalValidations: 1,
          avgConfidence: { $round: ['$avgConfidence', 1] },
          totalRewards: 1
        }
      },
      { $sort: { totalValidations: -1, avgConfidence: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if user can validate specific item
router.get('/:id/can-validate/:userId', async (req, res) => {
  try {
    const validation = await CommunityValidation.findById(req.params.id);
    if (!validation) {
      return res.status(404).json({ message: 'Validation not found' });
    }
    
    const canValidate = validation.canUserValidate(req.params.userId);
    res.json(canValidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dispute validation result
router.post('/:id/dispute', async (req, res) => {
  try {
    const { disputerId, reason, evidence } = req.body;
    
    const validation = await CommunityValidation.findById(req.params.id);
    if (!validation) {
      return res.status(404).json({ message: 'Validation not found' });
    }
    
    if (validation.status !== 'completed') {
      return res.status(400).json({ message: 'Can only dispute completed validations' });
    }
    
    validation.status = 'disputed';
    validation.metadata.dispute = {
      disputerId,
      reason,
      evidence,
      timestamp: new Date()
    };
    
    await validation.save();
    
    console.log(`⚖️ Validation disputed: ${reason}`);
    
    res.json({
      success: true,
      message: 'Dispute submitted successfully',
      validation
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
