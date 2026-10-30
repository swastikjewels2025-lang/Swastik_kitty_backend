import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

export const PaymentsView = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Record Cash Modal
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashForm, setCashForm] = useState({
    membershipId: '',
    amount: 5000,
    monthFor: 1
  });
  const [cashLoading, setCashLoading] = useState(false);
  const [cashSuccess, setCashSuccess] = useState('');
  const [cashError, setCashError] = useState('');

  const loadPayments = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterMethod) params.paymentMethod = filterMethod;
      if (searchTerm) params.search = searchTerm;

      const data = await api.getPayments(params);
      setPayments(data?.payments || []);
      setPagination(data?.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(1);
  }, [filterStatus, filterMethod]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadPayments(1);
  };

  const handleRecordCash = async (e) => {
    e.preventDefault();
    setCashLoading(true);
    setCashSuccess('');
    setCashError('');
    try {
      const res = await api.recordCashPayment({
        membershipId: cashForm.membershipId,
        amount: parseInt(cashForm.amount, 10),
        monthFor: parseInt(cashForm.monthFor, 10)
      });
      setCashSuccess(`Cash collection recorded! Receipt: ${res?.receiptUrl || 'Generated'}`);
      loadPayments(1);
      setTimeout(() => {
        setShowCashModal(false);
        setCashSuccess('');
        setCashForm({ membershipId: '', amount: 5000, monthFor: 1 });
      }, 1500);
    } catch (err) {
      setCashError(err.message || 'Failed to record cash payment.');
    } finally {
      setCashLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Financial Payments Ledger</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Authoritative transactional record of online gateway payments and in-store cash collections.
          </p>
        </div>

        <button
          onClick={() => setShowCashModal(true)}
          className="flex items-center space-x-1.5 bg-yellow-500 hover:bg-yellow-600 text-green-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer"
        >
          <Plus size={15} />
          <span>Record Counter Cash</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Search txn reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <select
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success Only</option>
          <option value="PENDING">Pending Only</option>
          <option value="FAILED">Failed</option>
        </select>

        <select
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
        >
          <option value="">All Methods</option>
          <option value="ONLINE">Online Gateway</option>
          <option value="CASH">Counter Cash</option>
        </select>

        <button
          onClick={() => loadPayments(pagination.page)}
          className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Reload</span>
        </button>

        <div className="ml-auto text-xs text-gray-500 font-medium">
          Total {pagination.total} records
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Txn Reference</th>
                <th className="px-4 py-3">Patron Name</th>
                <th className="px-4 py-3">Chit Token</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Gold Grams</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">
                      <div>{p.transactionId || p.orderId || p._id.slice(-8)}</div>
                      <div className="text-[10px] text-gray-400 font-sans">
                        {new Date(p.paidAt || p.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.userId?.name || 'Customer'}</div>
                      <div className="text-[11px] text-gray-500">{p.userId?.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-700">
                        {p.membershipId?.chitToken || `#SW-00${p.membershipId?.tokenNumber || '1'}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      M{p.monthFor}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      ₹{p.amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-green-700 font-semibold">
                      +{p.goldGrams?.toFixed(3)} g
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.paymentMethod === 'ONLINE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.receiptUrl ? (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-700 hover:text-green-800 font-semibold text-[11px]"
                        >
                          <span>PDF</span>
                          <ExternalLink size={12} className="ml-1" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Counter Cash Modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Record In-Store Cash Collection</h3>
            <p className="text-xs text-gray-500 mb-4">Generates an instant PDF receipt and reconciles the customer passbook.</p>

            {cashSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                {cashSuccess}
              </div>
            )}
            {cashError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {cashError}
              </div>
            )}

            <form onSubmit={handleRecordCash} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Membership ID</label>
                <input
                  type="text"
                  placeholder="e.g. 6ace0b7e2663fd0b53d80e7d"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={cashForm.membershipId}
                  onChange={(e) => setCashForm({ ...cashForm, membershipId: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Installment Month (1 - 12)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={cashForm.monthFor}
                  onChange={(e) => setCashForm({ ...cashForm, monthFor: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cash Amount (₹)</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cashLoading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-green-950 bg-yellow-500 hover:bg-yellow-600 shadow-sm cursor-pointer"
                >
                  {cashLoading ? 'Recording...' : 'Commit & Print Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
