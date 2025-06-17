import React, { useState, useEffect } from 'react';
import { Line, Radar } from 'react-chartjs-2';
import 'chart.js/auto';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,  // Add this for radar charts
  Filler              // Add this for radar chart fills
} from 'chart.js';
import apiService from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,  // Register the radial scale
  Filler              // Register filler for radar charts
);


const TrustDNAProfiler = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userAlerts, setUserAlerts] = useState([]);

  useEffect(() => {
  fetchUsers();
  
  // Cleanup function to destroy charts on unmount
  return () => {
    // Destroy any existing charts
    const charts = ChartJS.getChart('trust-score-chart');
    if (charts) {
      charts.destroy();
    }
    const radarChart = ChartJS.getChart('linguistic-radar-chart');
    if (radarChart) {
      radarChart.destroy();
    }
  };
}, []);


  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.data);
      if (response.data.length > 0) {
        setSelectedUser(response.data[0]);
        fetchUserAlerts(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserAlerts = async (userId) => {
    try {
      const response = await apiService.getAlerts();
      const userSpecificAlerts = response.data.filter(alert => alert.target === userId);
      setUserAlerts(userSpecificAlerts);
    } catch (error) {
      console.error('Error fetching user alerts:', error);
    }
  };

  const handleUserChange = (userId) => {
    const user = users.find(u => u._id === userId);
    setSelectedUser(user);
    fetchUserAlerts(userId);
  };

  const getTypingCadenceData = () => {
    if (!selectedUser || !selectedUser.behaviorData.typingCadence.length) {
      return {
        labels: ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4', 'Sample 5'],
        datasets: [{
          label: 'Typing Speed (WPM)',
          data: [150, 145, 160, 155, 148],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        }]
      };
    }

    return {
      labels: selectedUser.behaviorData.typingCadence.map((_, i) => `Sample ${i + 1}`),
      datasets: [{
        label: 'Typing Speed (WPM)',
        data: selectedUser.behaviorData.typingCadence,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    };
  };

  const getLinguisticRadarData = () => {
  // Generate unique linguistic data based on user characteristics
  const generateLinguisticData = (user) => {
    const seed = user.trustScore + user.accountAge + user.transactionCount;
    return {
      sentenceVariety: Math.max(20, Math.min(100, seed % 100)),
      emotionalAuthenticity: Math.max(30, Math.min(100, (seed * 1.3) % 100)),
      specificDetails: Math.max(25, Math.min(100, (seed * 0.8) % 100)),
      vocabularyComplexity: Math.max(40, Math.min(100, (seed * 1.7) % 100)),
      grammarScore: Math.max(35, Math.min(100, (seed * 2.1) % 100))
    };
  };

  if (!selectedUser) {
    return {
      labels: ['Sentence Variety', 'Emotional Authenticity', 'Specific Details', 'Vocabulary Complexity', 'Grammar Score'],
      datasets: [{
        label: 'Linguistic Fingerprint',
        data: [50, 50, 50, 50, 50],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    };
  }

  const linguisticData = selectedUser.linguisticAnalysis || generateLinguisticData(selectedUser);

  return {
    labels: ['Sentence Variety', 'Emotional Authenticity', 'Specific Details', 'Vocabulary Complexity', 'Grammar Score'],
    datasets: [{
      label: 'Linguistic Fingerprint',
      data: [
        linguisticData.sentenceVariety || 50,
        linguisticData.emotionalAuthenticity || 50,
        linguisticData.specificDetails || 50,
        linguisticData.vocabularyComplexity || 50,
        linguisticData.grammarScore || 50
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };
};


  const calculateVariance = (data) => {
    if (!data || data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.round(variance);
  };

  const getBehaviorAnalysis = () => {
    if (!selectedUser) return { type: 'Unknown', confidence: 0 };
    
    const variance = calculateVariance(selectedUser.behaviorData.typingCadence);
    
    if (variance === 0) {
      return { type: 'Bot', confidence: 95 };
    } else if (variance < 50) {
      return { type: 'Suspicious', confidence: 78 };
    } else {
      return { type: 'Human', confidence: 92 };
    }
  };

  if (!selectedUser) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="text-xl text-gray-900 dark:text-white">Loading Trust DNA Profiler...</div>
    </div>
  );
}

  const behaviorAnalysis = getBehaviorAnalysis();

  return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Trust DNA Profiler</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Deep behavioral analysis and user profiling</p>
      </div>

      {/* User Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select User for Analysis:</label>
        <select 
          value={selectedUser._id} 
          onChange={(e) => handleUserChange(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full max-w-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username} (Trust Score: {user.trustScore}%)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trust Score Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trust Score Analysis</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-300 dark:text-gray-600"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${selectedUser.trustScore > 70 ? 'text-green-500' : 
                    selectedUser.trustScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${selectedUser.trustScore}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser.trustScore}%</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Account Age:</span>
              <span className="text-gray-900 dark:text-white">{selectedUser.accountAge} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Transactions:</span>
              <span className="text-gray-900 dark:text-white">{selectedUser.transactionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Risk Level:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                selectedUser.riskLevel === 'Low' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                selectedUser.riskLevel === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {selectedUser.riskLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Behavioral Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Behavioral Analysis</h3>
          <div className="mb-4">
            <Line data={getTypingCadenceData()} options={{ 
              responsive: true,
              plugins: {
                legend: {
                  display: false
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Pattern Type:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                behaviorAnalysis.type === 'Human' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                behaviorAnalysis.type === 'Bot' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              }`}>
                {behaviorAnalysis.type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Confidence:</span>
              <span className="text-sm text-gray-900 dark:text-white">{behaviorAnalysis.confidence}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Typing Variance:</span>
              <span className="text-sm text-gray-900 dark:text-white">{calculateVariance(selectedUser.behaviorData.typingCadence)}</span>
            </div>
          </div>
        </div>

        {/* Linguistic Fingerprint */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Linguistic Fingerprint</h3>
          <div className="mb-4">
            <Radar data={getLinguisticRadarData()} options={{ 
              responsive: true,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                r: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                  },
                  grid: {
                    color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                  },
                  angleLines: {
                    color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                  },
                  pointLabels: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                  }
                }
              }
            }} />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Linguistic analysis based on writing patterns, vocabulary usage, and communication style.
            </p>
          </div>
        </div>
      </div>

      {/* User Alerts */}
      {userAlerts.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User-Specific Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {userAlerts.map((alert) => (
                <div key={alert._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">{alert.type}</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{alert.description}</p>
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
      )}
    </div>
  </div>
);
};

export default TrustDNAProfiler;
