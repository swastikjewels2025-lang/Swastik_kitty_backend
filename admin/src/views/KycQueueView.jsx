import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldX, ExternalLink, CheckCircle, RefreshCw, FileText, Edit2, Check, X } from 'lucide-react';
import { api } from '../services/api.js';

export const KycQueueView = ({ onKycReviewed }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Inline name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const loadPendingKyc = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPendingKyc();
      const list = data?.users || [];
      setUsers(list);
      if (list.length > 0 && !selectedUser) {
        setSelectedUser(list[0]);
      } else if (list.length === 0) {
        setSelectedUser(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pending KYC queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingKyc();
  }, []);

  const handleApprove = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      await api.reviewKyc(selectedUser._id, 'VERIFIED');
      setMessage(`KYC verified successfully for ${selectedUser.name}!`);
      if (onKycReviewed) onKycReviewed();
      const remaining = users.filter(u => u._id !== selectedUser._id);
      setUsers(remaining);
      setSelectedUser(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      setError(err.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setMessage('');
    setError('');
    try {
      await api.reviewKyc(selectedUser._id, 'REJECTED', rejectReason || 'Document unreadable or invalid.');
      setMessage(`KYC rejected for ${selectedUser.name}.`);
      setShowRejectModal(false);
      setRejectReason('');
      if (onKycReviewed) onKycReviewed();
      const remaining = users.filter(u => u._id !== selectedUser._id);
      setUsers(remaining);
      setSelectedUser(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      setError(err.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!selectedUser || !editingName.trim()) return;
    setSavingName(true);
    try {
      await api.updateUser(selectedUser._id, { name: editingName.trim() });
      const updatedUser = { ...selectedUser, name: editingName.trim() };
      setSelectedUser(updatedUser);
      setUsers(users.map(u => u._id === selectedUser._id ? updatedUser : u));
      setIsEditingName(false);
      setMessage(`Patron name updated to "${editingName.trim()}"!`);
    } catch (err) {
      setError(err.message || 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">KYC Compliance & Verification Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            PMLA & Hallmark compliant government document verification console.
          </p>
        </div>
        <button
          onClick={loadPendingKyc}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg shadow-2xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Reload ({users.length})</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Split Pane: List vs Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Pending Queue ({users.length})
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-xs">Loading queue...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle size={36} className="text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-800 text-sm">All Clear</p>
              <p className="text-xs text-gray-500 mt-0.5">No pending documents to review.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isSelected = selectedUser?._id === u._id;
                return (
                  <div
                    key={u._id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-yellow-50/60 border-yellow-400 shadow-xs'
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {u.name} {u.surname || ''}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {u.kyc?.documentType || 'DOC'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{u.phone}</div>
                    <div className="text-xs font-mono font-medium text-gray-700 mt-1">
                      {u.kyc?.documentNumberMasked || u.kyc?.documentNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {selectedUser ? (
            <div>
              <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-5">
                <div>
                  {isEditingName ? (
                    <form onSubmit={handleSaveName} className="flex items-center space-x-2">
                      <input
                        type="text"
                        required
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="text-base font-bold text-gray-900 px-2 py-1 border border-emerald-500 rounded-lg focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={savingName}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        title="Save Name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {selectedUser.name} {selectedUser.surname || ''}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(selectedUser.name || '');
                          setIsEditingName(true);
                        }}
                        className="p-1 text-gray-400 hover:text-emerald-700 cursor-pointer"
                        title="Edit Patron Name"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Phone: {selectedUser.phone} {selectedUser.email ? `• ${selectedUser.email}` : ''}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  PENDING REVIEW
                </span>
              </div>

              {/* ID Details */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">Government ID Type</div>
                  <div className="text-base font-bold text-gray-900 mt-0.5">
                    {selectedUser.kyc?.documentType || 'Aadhaar Card'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">ID Number</div>
                  <div className="text-base font-bold text-gray-900 mt-0.5 font-mono">
                    {selectedUser.kyc?.documentNumber || selectedUser.kyc?.documentNumberMasked || 'N/A'}
                  </div>
                </div>
              </div>

              {/* File Attachment */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-700 mb-2">Uploaded Document Certificate</div>
                <div className="p-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-center">
                  {selectedUser.kyc?.documentUrl ? (
                    <div>
                      {selectedUser.kyc.documentUrl.match(/\.(jpeg|jpg|png|webp)($|\?)/i) || selectedUser.kyc.documentUrl.startsWith('data:image/') || selectedUser.kyc.documentUrl.includes('cloudinary') ? (
                        <div className="mb-3 max-w-sm mx-auto overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                          <img 
                            src={selectedUser.kyc.documentUrl} 
                            alt="KYC Document Preview" 
                            className="max-h-56 mx-auto rounded object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <FileText size={32} className="text-yellow-600 mx-auto mb-2" />
                      )}
                      <div className="text-xs font-semibold text-gray-800">Government ID Uploaded</div>
                      <a
                        href={selectedUser.kyc.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 mt-3 px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs"
                      >
                        <ExternalLink size={13} />
                        <span>Inspect Original Document</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      Standard verification details registered via customer onboarding.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold cursor-pointer"
                >
                  <ShieldX size={15} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  <ShieldCheck size={15} />
                  <span>{actionLoading ? 'Verifying...' : 'Approve & Mark Verified'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-xs">
              Select a customer from the left queue to review compliance documentation.
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Reject Verification</h3>
            <p className="text-xs text-gray-500 mb-4">Please provide a specific reason for rejection delivered to patron.</p>
            
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Photo is blurry or document number does not match registered name."
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
