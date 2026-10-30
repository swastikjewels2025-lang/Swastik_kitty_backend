import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye } from 'lucide-react';
import { api } from '../services/api.js';

export const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // User detail drill-down modal
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (searchTerm) params.search = searchTerm;
      if (kycFilter) params.kycStatus = kycFilter;
      const data = await api.getUsers(params);
      setUsers(data?.users || []);
      setPagination(data?.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [kycFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleInspectUser = async (userId) => {
    setDetailLoading(true);
    try {
      const data = await api.getUserDetail(userId);
      setSelectedUserDetail(data);
    } catch (err) {
      alert(err.message || 'Failed to fetch customer profile.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Patrons Directory</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Registered customer accounts, KYC compliance levels, and enrolled kitty passbooks.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Search by name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <select
          className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
        >
          <option value="">All KYC Statuses</option>
          <option value="VERIFIED">Verified Only</option>
          <option value="PENDING">Pending Review</option>
          <option value="NOT_SUBMITTED">Not Submitted</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <button
          onClick={() => loadUsers(pagination.page)}
          className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Reload</span>
        </button>

        <div className="ml-auto text-xs text-gray-500 font-medium">
          Total {pagination.total} registered customers
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Mobile Phone</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Active Kitties</th>
                <th className="px-4 py-3">KYC Status</th>
                <th className="px-4 py-3">Registered On</th>
                <th className="px-4 py-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    Loading customers...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    No customer accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const kycStatus = u.kyc?.status || 'NOT_SUBMITTED';
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {u.name} {u.surname || ''}
                        </div>
                        <div className="text-[10px] text-gray-400 capitalize">{u.role}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{u.phone}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-yellow-800 bg-yellow-50 px-2.5 py-0.5 rounded-full border border-yellow-200 text-[11px]">
                          {u.membershipCount || 0} Schemes
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          kycStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          kycStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleInspectUser(u._id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md cursor-pointer"
                        >
                          View 360°
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedUserDetail.user?.name} {selectedUserDetail.user?.surname || ''}
                </h3>
                <p className="text-xs text-gray-500">UID: {selectedUserDetail.user?._id}</p>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-gray-500">Phone</div>
                  <div className="font-bold text-gray-900 mt-0.5">{selectedUserDetail.user?.phone}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-gray-500">Email</div>
                  <div className="font-bold text-gray-900 mt-0.5 truncate">{selectedUserDetail.user?.email || '-'}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-gray-500">KYC Status</div>
                  <div className="font-bold text-yellow-700 mt-0.5">{selectedUserDetail.user?.kyc?.status || 'NOT_SUBMITTED'}</div>
                </div>
              </div>

              {/* Memberships */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Enrolled Schemes ({selectedUserDetail.memberships?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedUserDetail.memberships?.map((m) => (
                    <div key={m._id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{m.schemeId?.name}</div>
                        <div className="text-gray-500 text-[11px]">Token: {m.chitToken || `#SW-00${m.tokenNumber}`}</div>
                      </div>
                      <div className="font-bold text-gray-900">
                        ₹{m.totalPaidAmount?.toLocaleString('en-IN')} ({m.accumulatedGoldGrams?.toFixed(3)}g)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Payment History ({selectedUserDetail.payments?.length || 0})</h4>
                <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {selectedUserDetail.payments?.map((p) => (
                    <div key={p._id} className="p-2.5 flex items-center justify-between">
                      <span className="text-gray-700">Month {p.monthFor} ({p.paymentMethod})</span>
                      <span className="font-semibold text-green-700">₹{p.amount?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
