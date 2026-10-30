import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, KeyRound, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

export const PickupsView = ({ onPickupConfirmed }) => {
  const [pickups, setPickups] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // OTP Verification Modal
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPickups = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const data = await api.getPickups(params);
      setPickups(data?.pickups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPickups();
  }, [filterStatus]);

  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    if (!selectedPickup) return;
    setConfirmLoading(true);
    setMessage('');
    setError('');
    try {
      await api.confirmCashPickup(selectedPickup.requestId, verificationOtp);
      setMessage(`Doorstep cash pickup of ₹${selectedPickup.amount} verified and confirmed!`);
      if (onPickupConfirmed) onPickupConfirmed();
      loadPickups();
      setTimeout(() => {
        setSelectedPickup(null);
        setVerificationOtp('');
        setMessage('');
      }, 1500);
    } catch (err) {
      setError(err.message || 'OTP verification failed. Check customer code.');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Doorstep Cash Pickup Operations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Logistics handover management with patron 4-digit verification OTP confirmation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Pickups</option>
            <option value="SCHEDULED">Scheduled Only</option>
            <option value="COLLECTED">Collected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={loadPickups}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Chit Token</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Pickup Address</th>
                <th className="px-4 py-3">Time Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    Loading cash pickups...
                  </td>
                </tr>
              ) : pickups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    No cash pickup requests found.
                  </td>
                </tr>
              ) : (
                pickups.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">
                      {p.requestId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.userId?.name || 'Customer'}</div>
                      <div className="text-[11px] text-gray-500">{p.contactPhone || p.userId?.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-700">
                        {p.membershipId?.chitToken || `#SW-00${p.membershipId?.tokenNumber || '1'}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      ₹{p.amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800 max-w-xs truncate">{p.pickupAddress}</div>
                      <div className="text-[11px] text-gray-400">PIN: {p.pickupPincode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.preferredTimeSlot || '10:00 - 18:00'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === 'COLLECTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'SCHEDULED' ? (
                        <button
                          onClick={() => {
                            setSelectedPickup(p);
                            setVerificationOtp(p.verificationOtp || '');
                          }}
                          className="px-3 py-1 text-xs font-semibold rounded-md bg-yellow-500 hover:bg-yellow-600 text-green-950 cursor-pointer shadow-2xs"
                        >
                          Verify OTP
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Done</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTP Modal */}
      {selectedPickup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-sm w-full p-6 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-1">Confirm Cash Collection</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter customer <strong>{selectedPickup.userId?.name}</strong>'s 4-digit confirmation OTP for <strong>₹{selectedPickup.amount?.toLocaleString('en-IN')}</strong>.
            </p>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmOtp}>
              <input
                type="text"
                maxLength={4}
                className="w-full text-center text-3xl font-bold tracking-widest py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-5 font-mono"
                value={verificationOtp}
                onChange={(e) => setVerificationOtp(e.target.value)}
                placeholder="• • • •"
                required
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedPickup(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-green-950 bg-yellow-500 hover:bg-yellow-600 shadow-sm cursor-pointer"
                >
                  {confirmLoading ? 'Verifying...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
