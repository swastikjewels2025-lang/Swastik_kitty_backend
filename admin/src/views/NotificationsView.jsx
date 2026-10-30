import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api.js';

export const NotificationsView = () => {
  const [title, setTitle] = useState('🌟 Festival Gold Coin Bonus');
  const [body, setBody] = useState('Pay your Month installment on time and earn double gold coins plus 0% making charges on gold jewellery!');
  const [type, setType] = useState('OFFER');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.broadcastNotification({
        title,
        body,
        type
      });
      setSuccessMsg(`Broadcast successfully sent to ${res?.sentCount || 0} patron(s)!`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch broadcast.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Broadcast Alerts & Push Notifications</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Dispatch promotional offers, installment due reminders, and store announcements to customer app feeds.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center">
            <CheckCircle size={16} className="mr-2" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center">
            <AlertCircle size={16} className="mr-2" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Alert Category</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="OFFER">Festival Offer & Bonus (OFFER)</option>
              <option value="EMI_DUE">Installment Due Reminder (EMI_DUE)</option>
              <option value="GENERAL">General Store Announcement (GENERAL)</option>
              <option value="WINNER_ALERT">Lucky Draw Announcement (WINNER_ALERT)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notification Title</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Special Gold Coin Bonus"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Message Body</label>
            <textarea
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter message text delivered to patron notification tray..."
              required
            />
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-[11px] uppercase tracking-wider font-bold text-yellow-700 mb-1">
              Mobile In-App Tray Preview
            </div>
            <div className="font-bold text-gray-900 text-sm">{title}</div>
            <div className="text-xs text-gray-600 mt-1">{body}</div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-green-950 font-semibold px-5 py-2.5 rounded-lg text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Send size={15} />
              <span>{loading ? 'Dispatching...' : 'Dispatch Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
