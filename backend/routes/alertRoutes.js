const express = require('express');
const router = express.Router();
const { AlertSystem, Alert } = require('../utils/alertSystem');

// Get all active alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await AlertSystem.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// **ADD THIS: Create a new alert**
router.post('/', async (req, res) => {
  try {
    const alertData = req.body;
    
    // Add default fields if missing
    if (!alertData.status) {
      alertData.status = 'Active';
    }
    if (!alertData.source) {
      alertData.source = 'manual';
    }
    
    const alert = new Alert(alertData);
    await alert.save();
    
    console.log('Alert created:', alert);
    
    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(400).json({ message: error.message });
  }
});

// **ADD THIS: Update alert by ID (for resolve functionality)**
router.put('/:id', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get alerts by type
router.get('/type/:type', async (req, res) => {
  try {
    const alerts = await Alert.find({ 
      type: req.params.type, 
      status: 'Active' 
    }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get alerts by severity
router.get('/severity/:severity', async (req, res) => {
  try {
    const alerts = await Alert.find({ 
      severity: req.params.severity, 
      status: 'Active' 
    }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resolve an alert
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await AlertSystem.resolveAlert(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Dismiss an alert
router.put('/:id/dismiss', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id, 
      { status: 'Dismissed' }, 
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get alert statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Alert.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const typeStats = await Alert.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({ severityStats: stats, typeStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
