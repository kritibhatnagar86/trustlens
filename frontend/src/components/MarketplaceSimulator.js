import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const MarketplaceSimulator = () => {
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' or 'fraud'
  const [products, setProducts] = useState([]);
  const [liveActivity, setLiveActivity] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    suspiciousActivities: 0,
    detectionRate: 0
  });

  

  const mockProducts = [
    {
      id: 1,
      name: 'Vintage Watch Collection',
      price: 1299.99,
      seller: 'WatchMaster_Pro',
      status: 'Verified',
      authenticityScore: 94.7,
      image: '⌚',
      category: 'Luxury',
      reviews: 23
    },
    {
      id: 2,
      name: 'Designer Handbag',
      price: 899.50,
      seller: 'FashionDeals_99',
      status: 'Flagged',
      authenticityScore: 23.1,
      image: '👜',
      category: 'Fashion',
      reviews: 45
    },
    {
      id: 3,
      name: 'Gaming Laptop',
      price: 2499.99,
      seller: 'TechGuru_2024',
      status: 'Verified',
      authenticityScore: 89.3,
      image: '💻',
      category: 'Electronics',
      reviews: 67
    },
    {
      id: 4,
      name: 'Rare Collectible Card',
      price: 599.99,
      seller: 'CardCollector_X',
      status: 'Under Review',
      authenticityScore: 67.8,
      image: '🃏',
      category: 'Collectibles',
      reviews: 12
    }
  ];

  useEffect(() => {
    setProducts(mockProducts);
    simulateActivity();
    
    // Update activity every 5 seconds
    const interval = setInterval(simulateActivity, 5000);
    return () => clearInterval(interval);
  }, [simulationMode]);

  const simulateActivity = () => {
    const activities = [
      'New user registration: TrustUser_2024',
      'Product listed: Smartphone Pro Max',
      'Review submitted for Gaming Laptop',
      'Trust score updated for WatchMaster_Pro',
      'Payment processed for Vintage Watch'
    ];

    const fraudActivities = [
      '🚨 Bot registration attempt blocked',
      '🚨 Fake review detected and removed',
      '🚨 Suspicious typing pattern flagged',
      '🚨 Counterfeit product listing blocked',
      '🚨 Multiple account creation attempt'
    ];

    const activityPool = simulationMode === 'fraud' 
      ? [...activities, ...fraudActivities] 
      : activities;

    const newActivity = {
      id: Date.now(),
      message: activityPool[Math.floor(Math.random() * activityPool.length)],
      timestamp: new Date().toLocaleTimeString(),
      type: simulationMode === 'fraud' && Math.random() > 0.6 ? 'fraud' : 'normal'
    };

    setLiveActivity(prev => [newActivity, ...prev.slice(0, 9)]);
    
    // Update stats
    setStats(prev => ({
      totalTransactions: prev.totalTransactions + 1,
      suspiciousActivities: prev.suspiciousActivities + (newActivity.type === 'fraud' ? 1 : 0),
      detectionRate: ((prev.suspiciousActivities + (newActivity.type === 'fraud' ? 1 : 0)) / (prev.totalTransactions + 1) * 100).toFixed(1)
    }));
  };

  const injectFraud = () => {
  const fraudMessages = [
    '🚨 Fraud scenario injected! Suspicious user activity detected.',
    '⚠️ Bot behavior pattern identified in recent transactions.',
    '🔍 Fake review detected using AI analysis.',
    '🚨 Unusual payment pattern flagged by system.',
    '⚡ Multiple accounts from same IP detected.'
  ];
  
  const randomMessage = fraudMessages[Math.floor(Math.random() * fraudMessages.length)];
  
  const newActivity = {
    id: Date.now(),
    message: randomMessage,
    type: 'fraud',
    timestamp: new Date().toLocaleTimeString()
  };
  
  setLiveActivity(prev => [newActivity, ...prev.slice(0, 19)]);
  setStats(prev => ({
    ...prev,
    suspiciousActivities: prev.suspiciousActivities + 1,
    detectionRate: Math.min(100, prev.detectionRate + 2)
  }));
};

  return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Marketplace Simulator</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Real-time fraud detection and product monitoring</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Simulation Mode:</label>
            <select 
              value={simulationMode} 
              onChange={(e) => setSimulationMode(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="normal">Normal Activity</option>
              <option value="fraud">Fraud Injection Mode</option>
            </select>
          </div>
          <button 
            onClick={injectFraud}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Inject Fraud Scenario
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transactions Monitored</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suspicious Activities</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.suspiciousActivities}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detection Rate</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.detectionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Product Listings</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((product) => (
                <div key={product.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{product.image}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'Verified' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      product.status === 'Flagged' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{product.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">by {product.seller}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">${product.price}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Auth: {product.authenticityScore}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          product.authenticityScore > 80 ? 'bg-green-500' :
                          product.authenticityScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${product.authenticityScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Activity Feed</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'fraud' ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      activity.type === 'fraud' ? 'text-red-700 dark:text-red-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default MarketplaceSimulator;
