import React, { useState } from 'react';
import { Coins, TrendingUp, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api.js';

export const GoldRatesView = ({ currentRates, onRateUpdated }) => {
  const [rate24k, setRate24k] = useState(currentRates?.rate24k || 7850);
  const [rate22k, setRate22k] = useState(currentRates?.rate22k || 7195);
  const [rateChangePct, setRateChangePct] = useState(currentRates?.rateChangePct || 0.45);
  const [benchmark, setBenchmark] = useState(currentRates?.benchmark || 'IBJA Official');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const updated = await api.updateGoldRates({
        rate24k: parseFloat(rate24k),
        rate22k: parseFloat(rate22k),
        rateChangePct: parseFloat(rateChangePct),
        benchmark
      });
      setMessage('Daily gold rates successfully published!');
      if (onRateUpdated) onRateUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to update rates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Current Benchmark Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Market Benchmark</span>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">Live Gold Benchmark Rates</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
            {benchmark}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">24 Karat Pure (999)</div>
            <div className="text-2xl font-bold text-yellow-700 mt-1">
              ₹{currentRates?.rate24k?.toLocaleString('en-IN') || '7,850'}/g
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">Base Bullion Standard</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">22 Karat Standard (916)</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              ₹{currentRates?.rate22k?.toLocaleString('en-IN') || '7,195'}/g
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">Jewellery Benchmark</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs text-gray-500 font-medium">Daily Fluctuation</div>
            <div className="text-2xl font-bold text-emerald-600 flex items-center mt-1">
              <TrendingUp size={20} className="mr-1" />
              <span>+{currentRates?.rateChangePct || 0.45}%</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">Market Session Movement</div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900">Publish New Daily Benchmark Rates</h3>
        <p className="text-xs text-gray-500 mt-1 mb-5">
          Updated rates are instantly pushed to patron mobile app passbooks, live coin calculators, and new kitty gram computations.
        </p>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center">
            <Check size={16} className="mr-2" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center">
            <AlertCircle size={16} className="mr-2" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">24K Per Gram Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={rate24k}
                onChange={(e) => setRate24k(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">22K Per Gram Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                value={rate22k}
                onChange={(e) => setRate22k(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Movement Percentage (%)</label>
              <input
                type="number"
                step="0.01"
                value={rateChangePct}
                onChange={(e) => setRateChangePct(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Benchmark Source</label>
              <input
                type="text"
                value={benchmark}
                onChange={(e) => setBenchmark(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="IBJA Official"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-green-950 font-semibold px-5 py-2.5 rounded-lg text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Coins size={16} />
              <span>{loading ? 'Publishing...' : 'Publish Official Rates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
