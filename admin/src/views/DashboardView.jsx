import React from 'react';
import { 
  Users, 
  FileText, 
  IndianRupee, 
  Scale, 
  ShieldAlert, 
  Truck, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const DashboardView = ({ stats, setActiveTab, onOpenRateModal }) => {
  const metrics = stats?.metrics || {
    totalPatrons: 0,
    activeMemberships: 0,
    totalRevenue: 0,
    totalGoldGrams: 0,
    pendingKyc: 0,
    pendingPickups: 0,
    activeSchemes: 0,
    currentRates: { rate24k: 7850, rate22k: 7195 }
  };

  const recentPayments = stats?.recent?.payments || [];
  const recentKyc = stats?.recent?.pendingKyc || [];
  const recentPickups = stats?.recent?.pickups || [];

  return (
    <div className="space-y-6">
      {/* 6 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Patrons */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Patrons</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{(metrics.totalPatrons || 0).toLocaleString('en-IN')}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">✓ Active Accounts</div>
        </div>

        {/* Active Memberships */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Kitties</span>
            <div className="p-2 rounded-lg bg-green-50 text-green-600 border border-green-100">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{(metrics.activeMemberships || 0).toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-500 mt-1">Across {metrics.activeSchemes || 0} Schemes</div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{(metrics.totalRevenue || 0).toLocaleString('en-IN')}</div>
          <div className="text-xs text-amber-600 font-medium mt-1">Reconciled Collections</div>
        </div>

        {/* Gold Liability */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gold Grams</span>
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600 border border-yellow-100">
              <Scale size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{(Number(metrics.totalGoldGrams) || 0).toFixed(2)} g</div>
          <div className="text-xs text-gray-500 mt-1">24K Physical Backed</div>
        </div>

        {/* Pending KYC */}
        <div 
          onClick={() => setActiveTab('kyc')}
          className={`bg-white rounded-xl p-5 shadow-sm border transition-all hover:shadow-md cursor-pointer ${
            metrics.pendingKyc > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">KYC Queue</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${metrics.pendingKyc > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {metrics.pendingKyc}
          </div>
          <div className="flex items-center text-xs text-amber-600 font-semibold mt-1">
            <span>Review Documents</span>
            <ArrowUpRight size={13} className="ml-0.5" />
          </div>
        </div>

        {/* Cash Pickups */}
        <div 
          onClick={() => setActiveTab('pickups')}
          className={`bg-white rounded-xl p-5 shadow-sm border transition-all hover:shadow-md cursor-pointer ${
            metrics.pendingPickups > 0 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pickups</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Truck size={16} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${metrics.pendingPickups > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
            {metrics.pendingPickups}
          </div>
          <div className="flex items-center text-xs text-blue-600 font-semibold mt-1">
            <span>OTP Verification</span>
            <ArrowUpRight size={13} className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Transactions + Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Ledger Transactions (2 cols wide) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Financial Ledger</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest verified customer installment collections</p>
            </div>
            <button 
              onClick={() => setActiveTab('payments')}
              className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight size={14} className="ml-0.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Patron</th>
                  <th className="px-4 py-3">Chit Token</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Gold Grams</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{p.userId?.name || 'Customer'}</div>
                        <div className="text-[11px] text-gray-500">{p.userId?.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-700">
                          {p.membershipId?.chitToken || `#SW-00${p.membershipId?.tokenNumber || '1'}`}
                        </span>
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

        {/* Right Column: Pending Queues */}
        <div className="space-y-6">
          {/* Pending KYC Reviews */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert size={18} className="text-amber-500" />
                <h3 className="font-bold text-gray-900 text-sm">Pending KYC Documents</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {recentKyc.length} Pending
              </span>
            </div>

            {recentKyc.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                ✓ All customer documents have been verified.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentKyc.map((u) => (
                  <div
                    key={u._id}
                    className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 text-xs">
                        {u.name} {u.surname || ''}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {u.kyc?.documentType} • {u.kyc?.documentNumberMasked || u.kyc?.documentNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('kyc')}
                      className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md cursor-pointer shadow-2xs"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doorstep Pickups Scheduled */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Truck size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-900 text-sm">Scheduled Cash Pickups</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {recentPickups.length} Scheduled
              </span>
            </div>

            {recentPickups.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                No cash pickups currently scheduled.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentPickups.map((pick) => (
                  <div
                    key={pick._id}
                    className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-gray-900 text-xs">
                        ₹{pick.amount?.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {pick.userId?.name} • {pick.contactPhone}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('pickups')}
                      className="px-2.5 py-1 text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-green-950 rounded-md cursor-pointer shadow-2xs"
                    >
                      Verify OTP
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
