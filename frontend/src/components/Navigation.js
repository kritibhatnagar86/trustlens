import React, { useState } from 'react';
import Dashboard from './Dashboard';
import MarketplaceSimulator from './MarketplaceSimulator';
import TrustDNAProfiler from './TrustDNAProfiler';
import PredictionMarket from './PredictionMarket';
import CommunityValidation from './CommunityValidation';
import ThemeToggle from './ThemeToggle';
import ProductTracker from './ProductTracker';
import AlertSystem from './AlertSystem';
import EnhancedReviewAuth from './EnhancedReviewAuth';




const Navigation = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'analytics', name: 'TrustDNA', icon: '🤖' },
  { id: 'product-tracker', name: 'Product Tracker', icon: '📦' },
  { id: 'review-auth', name: 'Review Auth', icon: '🔍' },
  { id: 'marketplace', name: 'Marketplace', icon: '🛒' },
  { id: 'predictions', name: 'Prediction Market', icon: '🎯' },
  { id: 'alerts', name: 'Alert System', icon: '🚨' },
  { id: 'community', name: 'Analytics', icon: '📈' }
];



  const renderContent = () => {
  switch (activeTab) {
    case 'dashboard':
      return <Dashboard />;
    case 'analytics':
      return <TrustDNAProfiler />;
    case 'product-tracker':
      return <ProductTracker />;
    case 'review-auth':
      return <EnhancedReviewAuth />;
    case 'marketplace':
      return <MarketplaceSimulator />;
    case 'predictions':
      return <PredictionMarket />;
    case 'alerts':
      return <AlertSystem />;
    case 'community':
      return <CommunityValidation />;
    default:
      return <Dashboard />;
  }
};



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TRUSTLENS</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">AI-Powered Trust System v1.0.0</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">System Online</span>
                </div>
            </div>
            </div>
        </div>
        </header>


      {/* Navigation Tabs */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
            {tabs.map((tab) => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
                </button>
            ))}
            </div>
        </div>
        </nav>


      {/* Content */}
        <main className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
        {renderContent()}
        </main>

    </div>
  );
};

export default Navigation;
