import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

export const BookingsView = () => {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Status update modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('DISPATCHED');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const data = await api.getBookings(params);
      setBookings(data?.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filterStatus]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setUpdating(true);
    try {
      await api.updateBookingStatus(selectedBooking._id, updateStatus, updateNotes);
      setSelectedBooking(null);
      setUpdateNotes('');
      loadBookings();
    } catch (err) {
      alert(err.message || 'Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bullion & Pure Gold Coins Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pre-booking and physical delivery fulfillment for pure 24K hallmark coins and jewellery orders.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="READY_FOR_PICKUP">Ready for Pickup</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={loadBookings}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Booking ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Item Specification</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Total Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>

            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    Loading coin bookings...
                    
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    No bullion bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">
                      {b.bookingId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{b.userId?.name || 'Customer'}</div>
                      <div className="text-[11px] text-gray-500">{b.userId?.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{b.itemName}</div>
                      <div className="text-[10px] text-yellow-700 font-medium">{b.karat} Hallmark</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{b.weightGrams} g</td>
                    <td className="px-4 py-3 text-gray-700">{b.quantity || 1}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      ₹{b.totalAmount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        b.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        b.status === 'DISPATCHED' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                        b.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setUpdateStatus(b.status);
                          setUpdateNotes(b.notes || '');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md cursor-pointer"
                      >
                        Fulfill
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Update Order Fulfillment</h3>
            <p className="text-xs text-gray-500 mb-4">{selectedBooking.bookingId} • {selectedBooking.itemName}</p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                >
                  <option value="CONFIRMED">CONFIRMED (Order Placed)</option>
                  <option value="DISPATCHED">DISPATCHED (In Courier Transit)</option>
                  <option value="READY_FOR_PICKUP">READY_FOR_PICKUP (Store Counter Ready)</option>
                  <option value="DELIVERED">DELIVERED (Fulfilled)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Courier AWB / Tracking Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="e.g. Dispatched via BlueDart AWB #98218731."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-green-950 bg-yellow-500 hover:bg-yellow-600 shadow-sm cursor-pointer"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
