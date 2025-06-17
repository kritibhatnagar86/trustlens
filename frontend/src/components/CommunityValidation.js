import React, { useState, useEffect } from 'react';

const CommunityValidation = () => {
  const [validations, setValidations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedValidation, setSelectedValidation] = useState(null);
  const [userVote, setUserVote] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    fetchValidationData();
  }, []);

  const fetchValidationData = async () => {
    try {
      const [validationsRes, statsRes] = await Promise.all([
        fetch('http://localhost:3001/api/community'),
        fetch('http://localhost:3001/api/community/stats/overview')
      ]);

      const validationsData = await validationsRes.json();
      const statsData = await statsRes.json();

      setValidations(validationsData);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching validation data:', error);
      setLoading(false);
    }
  };

  const submitValidation = async (validationId) => {
  try {
    console.log('Submitting validation:', { validationId, userVote, confidence, reasoning });

    const response = await fetch(`http://localhost:3001/api/community/${validationId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        validatorId: '6841c7373efc698423881aff',
        vote: userVote,
        confidence,
        reasoning,
        evidence: []
      })
    });

    const result = await response.json();
    console.log('Validation submission result:', result);

    if (response.ok) {
      // Check if reward was earned
      const rewardAmount = result.validation?.incentives?.rewardPool || 0;
      const wasCorrect = result.rewardEarned;
      
      const message = wasCorrect ? 
        `Validation submitted! You earned $${rewardAmount} reward!` : 
        'Thank you for participating! No reward this time.';
      
      alert(message);
      
      // Force refresh of validation data
      await fetchValidationData();
      setSelectedValidation(null);
      setUserVote('');
      setReasoning('');
      setConfidence(75);
    } else {
      alert(`Failed to submit validation: ${result.message}`);
    }
  } catch (error) {
    console.error('Error submitting validation:', error);
    alert(`Failed to submit validation: ${error.message}`);
  }
};



  const autoCreateValidations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/community/auto-create', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Created ${result.created} new validations!`);
        fetchValidationData();
      }
    } catch (error) {
      console.error('Error auto-creating validations:', error);
      alert('Failed to create validations');
    }
  };

  const getVoteColor = (vote) => {
    const colors = {
      'authentic': 'bg-green-100 text-green-800',
      'trustworthy': 'bg-green-100 text-green-800',
      'fake': 'bg-red-100 text-red-800',
      'untrustworthy': 'bg-red-100 text-red-800',
      'suspicious': 'bg-yellow-100 text-yellow-800'
    };
    return colors[vote] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="text-xl text-gray-900 dark:text-white">Loading Community Validations...</div>
    </div>
  );
}

  return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Community Validation</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Crowd-sourced fraud detection and trust assessment</p>
          </div>
          <button
            onClick={autoCreateValidations}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Auto-Create Validations
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Validations</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {stats.realTimeStats?.activeValidations || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {stats.realTimeStats?.completedValidations || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unique Validators</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {stats.realTimeStats?.uniqueValidators || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Rewards</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            ${stats.rewardStats?.totalRewards || 0}
          </p>
        </div>
      </div>

      {/* Active Validations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Community Validations</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Help verify suspicious accounts and content</p>
        </div>
        <div className="p-6">
          {validations.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p>No active validations available.</p>
              <p className="text-sm">Click "Auto-Create Validations" to generate new ones!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {validations.map((validation) => (
                <div key={validation._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {validation.question}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          validation.metadata.priority === 'high' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}>
                          {validation.metadata.priority} priority
                        </span>
                        <span>Reward: ${validation.incentives.rewardPool}</span>
                        <span>Expires: {new Date(validation.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedValidation(validation)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                    >
                      Validate
                    </button>
                  </div>

                  {/* Target Information */}
                  <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-4 mb-4 transition-colors duration-200">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Target Information</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Username:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{validation.targetId.username}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Trust Score:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{validation.targetId.trustScore}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Account Age:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{validation.targetId.accountAge} days</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Risk Level:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          validation.targetId.riskLevel === 'High' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {validation.targetId.riskLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Assessment */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 transition-colors duration-200">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">🤖 AI Assessment</h5>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-600 dark:text-gray-300">Prediction:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getVoteColor(validation.aiAssessment.prediction)}`}>
                          {validation.aiAssessment.prediction}
                        </span>
                        <span className="ml-4 text-gray-600 dark:text-gray-300">Confidence:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{validation.aiAssessment.confidence}%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Reasoning:</span> {validation.aiAssessment.reasoning.join(', ')}
                    </div>
                  </div>

                  {/* Current Consensus */}
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Validators:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{validation.consensus.totalValidators}/{validation.minimumValidators}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Consensus:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{validation.consensus.confidence}% confidence</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validation Modal */}
      {selectedValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Submit Validation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{selectedValidation.question}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Assessment</label>
              <select
                value={userVote}
                onChange={(e) => setUserVote(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select your assessment...</option>
                <option value="trustworthy">Trustworthy / Authentic</option>
                <option value="untrustworthy">Untrustworthy / Fake</option>
                <option value="suspicious">Suspicious / Unclear</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confidence Level: {confidence}%
              </label>
              <input
                type="range"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                min="1"
                max="100"
                className="w-full"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reasoning (Optional)</label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Explain your assessment..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 h-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                maxLength="500"
              />
            </div>
            
            <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm transition-colors duration-200">
              <p className="text-gray-900 dark:text-white"><strong>AI Assessment:</strong> {selectedValidation.aiAssessment.prediction} ({selectedValidation.aiAssessment.confidence}%)</p>
              <p className="text-gray-900 dark:text-white"><strong>Potential Reward:</strong> ${selectedValidation.incentives.rewardPool}</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => submitValidation(selectedValidation._id)}
                disabled={!userVote}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white py-2 rounded font-medium transition-colors duration-200"
              >
                Submit Validation
              </button>
              <button
                onClick={() => setSelectedValidation(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-2 rounded font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default CommunityValidation;
