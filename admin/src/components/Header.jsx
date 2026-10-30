import React from 'react';
import { RefreshCw, Coins, Send, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const Header = ({ 
  title, 
  subtitle, 
  rates, 
  onRefresh, 
  onOpenRateModal, 
  onOpenBroadcastModal,
  loading 
}) => {
  const { adminUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
      {/* Title & Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Hi, {adminUser?.username || 'Admin'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">{title} • {subtitle}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Live Gold Ticker Ribbon */}
        {rates && (
          <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-emerald-900">
              24K: ₹{rates.rate24k?.toLocaleString('en-IN')}/g
            </span>
            <span className="text-gray-400">|</span>
            <span className="font-semibold text-gray-700">
              22K: ₹{rates.rate22k?.toLocaleString('en-IN')}/g
            </span>
          </div>
        )}

        {/* Update Gold Rate */}
        <button
          onClick={onOpenRateModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
        >
          <Coins size={14} className="text-yellow-600" />
          <span>Update Rates</span>
        </button>

        {/* Quick Broadcast Button */}
        <button
          onClick={onOpenBroadcastModal}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-green-950 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Send size={13} />
          <span>Broadcast</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
        </button>

        {/* User Pill */}
        <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-green-800 text-yellow-400 font-bold flex items-center justify-center text-xs">
            {adminUser?.username?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-gray-800 leading-tight">{adminUser?.username || 'admin'}</p>
            <p className="text-gray-500 capitalize">{adminUser?.role || 'admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
