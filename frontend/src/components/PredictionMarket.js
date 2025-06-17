import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const PredictionMarket = () => {
  const [markets, setMarkets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [betPrediction, setBetPrediction] = useState('yes');

  useEffect(() => {
    fetchPredictionData();
  }, []);

  const fetchPredictionData = async () => {
    try {
      const [marketsRes, suggestionsRes, statsRes] = await Promise.all([
        fetch('http://localhost:3001/api/predictions'),
        fetch('http://localhost:3001/api/predictions/suggestions/ai'),
        fetch('http://localhost:3001/api/predictions/stats/overview')
      ]);

      const marketsData = await marketsRes.json();
      const suggestionsData = await suggestionsRes.json();
      const statsData = await statsRes.json();

      setMarkets(marketsData);
      setSuggestions(suggestionsData.suggestions || []);
      setStats(statsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching prediction data:', error);
      setLoading(false);
    }
  };

  const createMarketFromSuggestion = async (suggestion) => {
  try {
    const marketData = {
      targetUserId: suggestion.targetUser,
      marketType: suggestion.type,
      marketQuestion: suggestion.question,
      predictionTarget: {
        value: suggestion.type === 'trust_score_prediction' ? 70 : 1,
        metric: suggestion.type === 'trust_score_prediction' ? 'trust_score' : 'fraud_likelihood'
      },
      timeframeDays: suggestion.type === 'trust_score_prediction' ? 30 : 14,
      createdBy: '6841c7373efc698423881aff' // Use valid ObjectId instead of "system"
    };

    console.log('Creating market with data:', marketData);

    const response = await fetch('http://localhost:3001/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marketData)
    });

    const result = await response.json();
    console.log('Market creation response:', result);

    if (response.ok) {
      await fetchPredictionData();
      alert('Market created successfully!');
    } else {
      alert(`Failed to create market: ${result.message}`);
    }
  } catch (error) {
    console.error('Error creating market:', error);
    alert(`Failed to create market: ${error.message}`);
  }
};

  const placeBet = async (marketId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/predictions/${marketId}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bettorId: '6841c7373efc698423881aff', // Demo user ID
          prediction: betPrediction,
          amount: betAmount,
          confidence: 75
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Bet placed successfully! New odds: Yes ${result.newOdds.yes}x, No ${result.newOdds.no}x`);
        fetchPredictionData(); // Refresh data
        setSelectedMarket(null);
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      alert('Failed to place bet');
    }
  };

  if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="text-xl text-gray-900 dark:text-white">Loading Prediction Markets...</div>
    </div>
  );
}


  return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Trust Prediction Markets</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">AI-powered prediction markets for user behavior and fraud detection</p>
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Markets</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{markets.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Suggestions</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{suggestions.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Volume</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            ${stats.bettingStats?.totalVolume || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avg Bet Size</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            ${Math.round(stats.bettingStats?.avgBetSize || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Market Suggestions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Market Suggestions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Markets recommended by our AI fraud detection system</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{suggestion.question}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      suggestion.type === 'fraud_likelihood' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    }`}>
                      {suggestion.type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">AI Prediction: <strong className="text-gray-900 dark:text-white">{suggestion.aiPrediction.prediction.toUpperCase()}</strong></span>
                      <span className="text-gray-600 dark:text-gray-300">Confidence: <strong className="text-gray-900 dark:text-white">{suggestion.aiPrediction.confidence}%</strong></span>
                    </div>
                    <div className="mt-1">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Reasoning: {suggestion.aiPrediction.reasoning.join(', ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Suggested Odds: </span>
                      <span className="font-medium text-gray-900 dark:text-white">Yes {suggestion.suggestedOdds.yes}x, No {suggestion.suggestedOdds.no}x</span>
                    </div>
                    <button
                      onClick={() => createMarketFromSuggestion(suggestion)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                    >
                      Create Market
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Markets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Prediction Markets</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Live markets you can bet on</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {markets.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>No active markets yet.</p>
                  <p className="text-sm">Create markets from AI suggestions above!</p>
                </div>
              ) : (
                markets.map((market) => (
                  <div key={market._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{market.marketQuestion}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        market.marketType === 'fraud_likelihood' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {market.marketType.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Pool: <strong className="text-gray-900 dark:text-white">${market.totalPool}</strong></span>
                        <span className="text-gray-600 dark:text-gray-300">Bettors: <strong className="text-gray-900 dark:text-white">{market.marketMetrics.totalBettors}</strong></span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-300">Yes: {market.marketMetrics.yesPercentage.toFixed(1)}%</span>
                        <span className="text-gray-600 dark:text-gray-300">No: {market.marketMetrics.noPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Current Odds: </span>
                        <span className="font-medium text-gray-900 dark:text-white">Yes {market.currentOdds.yes.toFixed(2)}x, No {market.currentOdds.no.toFixed(2)}x</span>
                      </div>
                      <button
                        onClick={() => setSelectedMarket(market)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors duration-200"
                      >
                        Place Bet
                      </button>
                    </div>
                    
                    {market.aiPrediction && (
                      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs transition-colors duration-200">
                        <strong className="text-gray-900 dark:text-white">AI Prediction:</strong> 
                        <span className="text-gray-700 dark:text-gray-200"> {market.aiPrediction.prediction.toUpperCase()} ({market.aiPrediction.confidence}% confidence)</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Betting Modal */}
      {selectedMarket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 transition-colors duration-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Place Bet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{selectedMarket.marketQuestion}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prediction</label>
              <select
                value={betPrediction}
                onChange={(e) => setBetPrediction(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="yes">Yes ({selectedMarket.currentOdds.yes.toFixed(2)}x odds)</option>
                <option value="no">No ({selectedMarket.currentOdds.no.toFixed(2)}x odds)</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bet Amount ($)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                min="1"
                max="1000"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded transition-colors duration-200">
              <p className="text-sm text-gray-900 dark:text-white">
                <strong>Potential Payout:</strong> $
                {(betAmount * (betPrediction === 'yes' ? selectedMarket.currentOdds.yes : selectedMarket.currentOdds.no)).toFixed(2)}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => placeBet(selectedMarket._id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium transition-colors duration-200"
              >
                Place Bet
              </button>
              <button
                onClick={() => setSelectedMarket(null)}
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

export default PredictionMarket;
