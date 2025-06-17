import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

const ProductTracker = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetchProductData();
  }, []);

  const fetchProductData = async () => {
    try {
      // Fetch products
      const productsRes = await fetch('http://localhost:3001/api/products');
      const productsData = await productsRes.json();
      setProducts(productsData);

      if (productsData.length > 0) {
        const firstProduct = productsData[0];
        setSelectedProduct(firstProduct);
        await fetchProductAnalytics(firstProduct._id);
        await fetchProductTimeline(firstProduct._id);
      }

      // Fetch seller insights (using first product's seller)
      if (productsData.length > 0 && productsData[0].seller) {
        const insightsRes = await fetch(`http://localhost:3001/api/product-lifecycle/insights/${productsData[0].seller}`);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(insightsData);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching product data:', error);
      setLoading(false);
    }
  };

  const fetchProductAnalytics = async (productId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/product-lifecycle/analytics/${productId}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setAnalytics(analyticsData);
      } else {
        // Initialize lifecycle if it doesn't exist
        await initializeLifecycle(productId);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchProductTimeline = async (productId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/product-lifecycle/timeline/${productId}`);
      if (response.ok) {
        const timelineData = await response.json();
        setTimeline(timelineData.timeline || []);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const initializeLifecycle = async (productId) => {
    try {
      const response = await fetch('http://localhost:3001/api/product-lifecycle/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          sellerId: selectedProduct?.seller || '6841c7373efc698423881aff',
          initialPrice: selectedProduct?.price || 0
        })
      });

      if (response.ok) {
        await fetchProductAnalytics(productId);
        await fetchProductTimeline(productId);
      }
    } catch (error) {
      console.error('Error initializing lifecycle:', error);
    }
  };

  const handleProductChange = async (productId) => {
    const product = products.find(p => p._id === productId);
    setSelectedProduct(product);
    await fetchProductAnalytics(productId);
    await fetchProductTimeline(productId);
  };

  const progressStage = async (newStage) => {
    try {
      const response = await fetch('http://localhost:3001/api/product-lifecycle/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          newStage,
          performedBy: selectedProduct.seller || '6841c7373efc698423881aff',
          details: { timestamp: new Date(), action: `Progressed to ${newStage}` }
        })
      });

      if (response.ok) {
        await fetchProductAnalytics(selectedProduct._id);
        await fetchProductTimeline(selectedProduct._id);
        alert(`Product progressed to ${newStage} stage!`);
      }
    } catch (error) {
      console.error('Error progressing stage:', error);
    }
  };

  const trackView = async () => {
    try {
      await fetch('http://localhost:3001/api/product-lifecycle/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          viewerId: '6841c7373efc698423881aff'
        })
      });

      await fetchProductAnalytics(selectedProduct._id);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending_approval': 'bg-yellow-100 text-yellow-800',
      'listed': 'bg-blue-100 text-blue-800',
      'promoted': 'bg-purple-100 text-purple-800',
      'sold': 'bg-green-100 text-green-800',
      'delivered': 'bg-green-200 text-green-900',
      'reviewed': 'bg-indigo-100 text-indigo-800',
      'archived': 'bg-gray-200 text-gray-600'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getPerformanceChartData = () => {
    if (!analytics) return { labels: [], datasets: [] };

    return {
      labels: ['Views', 'Inquiries', 'Favorites'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          analytics.performance.views || 0,
          analytics.performance.inquiries || 0,
          analytics.performance.favorites || 0
        ],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        borderWidth: 2
      }]
    };
  };

  const getTrustTrendData = () => {
    if (!analytics?.trust?.trustTrend) return { labels: [], datasets: [] };

    const trend = analytics.trust.trustTrend.slice(-7); // Last 7 entries
    return {
      labels: trend.map((_, i) => `Day ${i + 1}`),
      datasets: [{
        label: 'Trust Score',
        data: trend.map(t => t.score),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-xl text-gray-900 dark:text-white">Loading Product Tracker...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Product Lifecycle Tracker</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Monitor product journey from creation to completion</p>
        </div>

        {/* Product Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Product:</label>
              <select 
                value={selectedProduct?._id || ''} 
                onChange={(e) => handleProductChange(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} - ${product.price}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
  <button
    onClick={trackView}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
  >
    Track View
  </button>
  <button
    onClick={() => progressStage('listed')}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
  >
    List Product
  </button>
  <button
    onClick={() => progressStage('promoted')}
    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
  >
    Promote
  </button>
  <button
    onClick={() => progressStage('sold')}
    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
  >
    Mark Sold
  </button>
</div>

          </div>
        </div>

        {selectedProduct && (
          <>
            {/* Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Stage</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStageColor(analytics?.summary?.currentStage || 'draft')}`}>
                  {analytics?.summary?.currentStage || 'draft'}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Views</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {analytics?.performance?.views || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trust Score</h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {analytics?.trust?.authenticityScore || 50}%
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Days Listed</h3>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {analytics?.summary?.daysListed || 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Performance Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Performance Metrics</h3>
                <Bar data={getPerformanceChartData()} options={{ 
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

              {/* Trust Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Trust Score Trend</h3>
                <Line data={getTrustTrendData()} options={{ 
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

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Lifecycle Timeline</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {timeline.length > 0 ? timeline.map((event, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className={`w-3 h-3 rounded-full mt-2 ${getStageColor(event.stage).includes('green') ? 'bg-green-500' : 
                        getStageColor(event.stage).includes('blue') ? 'bg-blue-500' :
                        getStageColor(event.stage).includes('yellow') ? 'bg-yellow-500' : 'bg-gray-500'}`}>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-white">{event.action}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(event.stage)}`}>
                            {event.stage}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            By {event.performedBy} • {new Date(event.timestamp).toLocaleString()}
                        </p>

                        {event.details && Object.keys(event.details).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {JSON.stringify(event.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <p>No timeline events yet.</p>
                      <p className="text-sm">Track views or progress stages to see activity!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductTracker;
