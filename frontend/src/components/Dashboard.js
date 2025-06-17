import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import apiService from '../services/api';
import websocketService from '../services/websocketService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    users: [],
    alerts: [],
    reviews: [],
    products: []
  });
  const [loading, setLoading] = useState(true);
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [liveActivity, setLiveActivity] = useState([]);
  const [behavioralTracking, setBehavioralTracking] = useState(false);

  useEffect(() => {
    initializeRealTimeConnection();
    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => {
      clearInterval(interval);
      websocketService.disconnect();
    };
  }, []);

  const initializeRealTimeConnection = () => {
    console.log('🔌 Initializing real-time connection...');
    
    // Connect to WebSocket server
    websocketService.connect();
    
    // Subscribe to alerts
    websocketService.subscribeToAlerts({ severity: 'High' });
    
    // Setup event listeners for real-time updates
    websocketService.addEventListener('alert', handleRealTimeAlert);
    websocketService.addEventListener('trustScoreChange', handleTrustScoreChange);
    websocketService.addEventListener('marketplaceUpdate', handleMarketplaceUpdate);
    websocketService.addEventListener('typingAnalysis', handleTypingAnalysis);
    websocketService.addEventListener('newAlert', handleNewAlert);
    
    // Update connection status
    const updateConnectionStatus = () => {
      setConnectionStatus(websocketService.getConnectionStatus());
    };
    
    // Check connection status every 5 seconds
    const statusInterval = setInterval(updateConnectionStatus, 5000);
    updateConnectionStatus();
    
    return () => clearInterval(statusInterval);
  };

  const handleRealTimeAlert = (alert) => {
    console.log('🚨 Real-time alert received:', alert);
    setRealTimeAlerts(prev => [alert, ...prev.slice(0, 9)]);
    addLiveActivity(`🚨 ALERT: ${alert.type} - ${alert.severity}`, 'alert');
  };

  const handleTrustScoreChange = (data) => {
    console.log('📊 Trust score changed:', data);
    addLiveActivity(`📊 Trust score changed: ${data.change > 0 ? '+' : ''}${data.change}`, 'trust');
  };

  const handleMarketplaceUpdate = (data) => {
    console.log('🛒 Marketplace update:', data);
    addLiveActivity(`🛒 Marketplace: ${data.type || 'Activity detected'}`, 'marketplace');
  };

  const handleTypingAnalysis = (data) => {
    console.log('⌨️ Typing analysis:', data);
    if (data.analysis.classification.risk === 'High') {
      addLiveActivity(`⌨️ Suspicious typing detected: ${data.analysis.classification.type}`, 'behavior');
    }
  };

  const handleNewAlert = (alert) => {
    console.log('🔔 New alert:', alert);
    setRealTimeAlerts(prev => [alert, ...prev.slice(0, 9)]);
  };

  const addLiveActivity = (message, type = 'info') => {
    const activity = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLiveActivity(prev => [activity, ...prev.slice(0, 19)]);
  };

  const fetchDashboardData = async () => {
    try {
      const [usersRes, alertsRes, reviewsRes, productsRes] = await Promise.all([
        apiService.getUsers(),
        apiService.getAlerts(),
        apiService.getReviews(),
        apiService.getProducts()
      ]);

      setDashboardData({
        users: usersRes.data,
        alerts: alertsRes.data,
        reviews: reviewsRes.data,
        products: productsRes.data
      });
      setLoading(false);
      addLiveActivity('📊 Dashboard data refreshed', 'system');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
      addLiveActivity('❌ Dashboard refresh failed', 'error');
    }
  };

  const startBehavioralTracking = () => {
  if (dashboardData.users.length > 0) {
    const userId = dashboardData.users[0]._id; // Fix: Add [0] to get first user
    websocketService.startBehavioralTracking(userId);
    setBehavioralTracking(true);
    addLiveActivity('🎯 Started behavioral tracking', 'system');
  }
};


  const stopBehavioralTracking = () => {
    websocketService.stopBehavioralTracking();
    setBehavioralTracking(false);
    addLiveActivity('🛑 Stopped behavioral tracking', 'system');
  };

  const calculateMetrics = () => {
    const totalUsers = dashboardData.users.length;
    const avgTrustScore = dashboardData.users.length > 0 
      ? (dashboardData.users.reduce((sum, user) => sum + user.trustScore, 0) / totalUsers).toFixed(1)
      : 0;
    const activeAlerts = dashboardData.alerts.filter(alert => alert.status === 'Active').length;
    const fraudDetectionRate = dashboardData.reviews.length > 0
      ? ((dashboardData.reviews.filter(review => !review.isAIGenerated).length / dashboardData.reviews.length) * 100).toFixed(1)
      : 0;

    return { totalUsers, avgTrustScore, activeAlerts, fraudDetectionRate };
  };

  const getTrustScoreChartData = () => {
    const scores = dashboardData.users.map(user => user.trustScore);
    return {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Average Trust Score',
          data: [65, 72, 78, calculateMetrics().avgTrustScore],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };

  const getAlertDistributionData = () => {
    const alertCounts = {
      High: dashboardData.alerts.filter(alert => alert.severity === 'High').length,
      Medium: dashboardData.alerts.filter(alert => alert.severity === 'Medium').length,
      Low: dashboardData.alerts.filter(alert => alert.severity === 'Low').length,
      Critical: dashboardData.alerts.filter(alert => alert.severity === 'Critical').length,
    };

    return {
      labels: ['High', 'Medium', 'Low', 'Critical'],
      datasets: [
        {
          data: [alertCounts.High, alertCounts.Medium, alertCounts.Low, alertCounts.Critical],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
          borderWidth: 2,
        },
      ],
    };
  };

  const metrics = calculateMetrics();

  if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="text-xl text-gray-900 dark:text-white">Loading TRUSTLENS Real-Time Dashboard...</div>
    </div>
  );
}

  return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
    <div className="max-w-7xl mx-auto">
      {/* Header with Real-Time Status */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TRUSTLENS Real-Time Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">AI-Powered Marketplace Trust System with Live Monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {connectionStatus.isConnected ? 'Real-Time Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={behavioralTracking ? stopBehavioralTracking : startBehavioralTracking}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                behavioralTracking 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {behavioralTracking ? 'Stop Tracking' : 'Start Behavioral Tracking'}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalUsers}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Real-time tracking</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Trust Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.avgTrustScore}%</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">AI-enhanced</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeAlerts}</p>
              <p className="text-xs text-red-600 dark:text-red-400">Live monitoring</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Detection Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.fraudDetectionRate}%</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">ML-powered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trust Score Trends</h3>
          <Line data={getTrustScoreChartData()} options={{ 
            responsive: true,
            plugins: {
              legend: {
                labels: {
                  color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                },
                grid: {
                  color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                }
              },
              y: {
                ticks: {
                  color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                },
                grid: {
                  color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                }
              }
            }
          }} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Alert Distribution</h3>
          <Doughnut data={getAlertDistributionData()} options={{ 
            responsive: true,
            plugins: {
              legend: {
                labels: {
                  color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
                }
              }
            }
          }} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Live Activity Feed</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {liveActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-2">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'alert' ? 'bg-red-500' :
                  activity.type === 'trust' ? 'bg-blue-500' :
                  activity.type === 'behavior' ? 'bg-yellow-500' :
                  activity.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{activity.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-Time Alerts & Recent Activity</h3>
        </div>
        <div className="p-6">
          {[...realTimeAlerts, ...dashboardData.alerts].slice(0, 8).map((alert, index) => (
            <div key={alert._id || alert.id || index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  alert.severity === 'Critical' ? 'bg-purple-500' :
                  alert.severity === 'High' ? 'bg-red-500' :
                  alert.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{alert.type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{alert.description}</p>
                  {alert.timestamp && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                alert.severity === 'Critical' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                alert.severity === 'High' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                alert.severity === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 
                'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              }`}>
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
};

export default Dashboard;
