import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';

const EnhancedReviewAuth = () => {
  const [reviews, setReviews] = useState([]);
  const [authRecords, setAuthRecords] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [authDetails, setAuthDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchReviewData();
  }, []);

  const fetchReviewData = async () => {
  try {
    const reviewsRes = await fetch('http://localhost:3001/api/reviews');
    const reviewsData = await reviewsRes.json();
    setReviews(reviewsData || []); // Ensure it's always an array

    // Fetch authentication records for reviews
    const authPromises = (reviewsData || []).map(async (review) => {
      try {
        if (!review || !review._id) return null; // Check if review exists
        
        const authRes = await fetch(`http://localhost:3001/api/enhanced-reviews/summary/${review._id}`);
        if (authRes.ok) {
          const authData = await authRes.json();
          return { reviewId: review._id, ...authData };
        }
        return null;
      } catch (error) {
        console.error('Error fetching auth data for review:', review?._id, error);
        return null;
      }
    });

    const authResults = await Promise.all(authPromises);
    const validAuthRecords = authResults.filter(record => record !== null && record.reviewId);
    setAuthRecords(validAuthRecords);
    
    calculateStats(validAuthRecords);
    setLoading(false);
  } catch (error) {
    console.error('Error fetching review data:', error);
    setReviews([]); // Set empty array on error
    setAuthRecords([]);
    setLoading(false);
  }
};


  const calculateStats = (authData) => {
    const stats = {
      total: authData.length,
      authentic: authData.filter(a => a.status === 'authentic').length,
      suspicious: authData.filter(a => a.status === 'suspicious').length,
      fake: authData.filter(a => a.status === 'fake').length,
      investigating: authData.filter(a => a.status === 'requires_investigation').length,
      avgScore: authData.length > 0 ? 
        Math.round(authData.reduce((sum, a) => sum + a.overallScore, 0) / authData.length) : 0
    };
    setStats(stats);
  };

  const authenticateReview = async (reviewId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/enhanced-reviews/authenticate/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: '192.168.1.1',
          deviceFingerprint: 'browser_fingerprint',
          browserInfo: 'Chrome/91.0'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Authentication completed! Score: ${result.overallScore}%, Status: ${result.status}`);
        await fetchReviewData();
      }
    } catch (error) {
      console.error('Error authenticating review:', error);
    }
  };

  const viewAuthDetails = async (reviewId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/enhanced-reviews/details/${reviewId}`);
      if (response.ok) {
        const details = await response.json();
        setAuthDetails(details);
      }
    } catch (error) {
      console.error('Error fetching auth details:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'authentic': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'suspicious': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'fake': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      'requires_investigation': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getWorkflowStageColor = (stage) => {
    const colors = {
      'automated_screening': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'community_review': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'expert_validation': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'final_approval': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'completed': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    };
    return colors[stage] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getAuthScoreData = () => {
    const scoreRanges = {
      'Excellent (90-100)': authRecords.filter(a => a.overallScore >= 90).length,
      'Good (70-89)': authRecords.filter(a => a.overallScore >= 70 && a.overallScore < 90).length,
      'Fair (50-69)': authRecords.filter(a => a.overallScore >= 50 && a.overallScore < 70).length,
      'Poor (0-49)': authRecords.filter(a => a.overallScore < 50).length
    };

    return {
      labels: Object.keys(scoreRanges),
      datasets: [{
        data: Object.values(scoreRanges),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        borderWidth: 2
      }]
    };
  };

  const getAuthTrendData = () => {
    // Simulate trend data over last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString();
    });

    const trendData = last7Days.map(() => Math.floor(Math.random() * 20) + 60); // Random scores 60-80

    return {
      labels: last7Days,
      datasets: [{
        label: 'Average Auth Score',
        data: trendData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    };
  };

  const filteredReviews = reviews.filter(review => {
  const authRecord = authRecords.find(auth => auth && auth.reviewId === review._id);
  if (filter === 'all') return true;
  return authRecord && authRecord.status === filter;
});


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">Loading Enhanced Review Authentication...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Enhanced Review Authentication</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Multi-step verification and credibility assessment for reviews</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Reviews</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.total || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Authentic</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.authentic || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Suspicious</h3>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.suspicious || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Investigating</h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{stats.investigating || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avg Score</h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{stats.avgScore}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Reviews</option>
              <option value="authentic">Authentic</option>
              <option value="suspicious">Suspicious</option>
              <option value="fake">Fake</option>
              <option value="requires_investigation">Under Investigation</option>
            </select>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Authentication Score Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authentication Score Distribution</h3>
            <Doughnut data={getAuthScoreData()} options={{ 
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

          {/* Authentication Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authentication Score Trend</h3>
            <Line data={getAuthTrendData()} options={{ 
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
                  }
                },
                y: {
                  ticks: {
                    color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Review Authentication List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Authentication Management</h3>
          </div>
          <div className="p-6">
            {filteredReviews.length === 0 ? (
  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
    <p>No reviews found with current filters.</p>
    <p className="text-sm">Try adjusting your filters or authenticate more reviews!</p>
  </div>
) : (
  <div className="space-y-4">
    {filteredReviews.map((review) => {
      if (!review || !review._id) return null; // Safety check
      
      const authRecord = authRecords.find(auth => auth && auth.reviewId === review._id);
      return (
        <div key={review._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">Review by {review.reviewer?.username || 'Unknown'}</h4>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Rating: {review.rating}/5</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{review.content}</p>
                          
                          {authRecord ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Auth Score:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{authRecord.overallScore}%</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(authRecord.status)}`}>
                                  {authRecord.status}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Workflow:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getWorkflowStageColor(authRecord.workflowStage)}`}>
                                  {authRecord.workflowStage}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Fraud Indicators:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{authRecord.fraudIndicators}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              No authentication record found
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          {authRecord ? (
                            <button
                              onClick={() => viewAuthDetails(review._id)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
                            >
                              View Details
                            </button>
                          ) : (
                            <button
                              onClick={() => authenticateReview(review._id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors duration-200"
                            >
                              Authenticate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Authentication Details Modal */}
        {authDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto transition-colors duration-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authentication Details</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Overall Score:</label>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{authDetails.overallAuthenticationScore}%</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Authentication Steps:</label>
                  <div className="space-y-2">
                    {authDetails.authenticationSteps?.map((step, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-900 dark:text-white">{step.step.replace('_', ' ')}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          step.status === 'passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {step.status} ({step.score || 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credibility Factors:</label>
                  <div className="text-sm space-y-1">
                    <div>Purchase Verified: {authDetails.credibilityFactors?.purchaseVerification?.verified ? 'Yes' : 'No'}</div>
                    <div>Review Consistency: {authDetails.credibilityFactors?.reviewerHistory?.reviewConsistency || 0}%</div>
                    <div>Content Quality: {authDetails.credibilityFactors?.contentQuality?.detailLevel || 0}%</div>
                  </div>
                </div>

                {authDetails.fraudIndicators?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fraud Indicators:</label>
                    <div className="space-y-1">
                      {authDetails.fraudIndicators.map((indicator, index) => (
                        <div key={index} className="text-sm text-red-600 dark:text-red-400">
                          • {indicator.indicator} ({indicator.severity})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setAuthDetails(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 rounded font-medium transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedReviewAuth;
