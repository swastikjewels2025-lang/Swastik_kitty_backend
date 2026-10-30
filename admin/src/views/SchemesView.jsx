import React, { useState, useEffect } from 'react';
import { Plus, Eye, Check, Edit2, Trash2, X, Sparkles, Layers, Clock, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

const DURATION_PRESETS = [3, 4, 6, 11, 12];
const SLOT_PRESETS = [25, 50, 75, 100];
const SUGGESTED_BENEFITS = [
  'Guaranteed 12th Month Bonus',
  '0% Making Charges on Gold Jewellery',
  '100% BIS 916 Hallmarked Gold',
  '24K Physical Gold Coin on Maturity',
  'Priority Lucky Draw Chit Allocation'
];

export const SchemesView = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [schemeMembers, setSchemeMembers] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheme, setNewScheme] = useState({
    name: 'Swastik Suvarna Varsha 10K',
    targetAmount: 120000,
    monthlyInstallment: 10000,
    durationMonths: 12,
    totalSlots: 50,
    maxCapacity: 50,
    bonusAmount: 10000,
    benefits: ['Guaranteed 12th Month Bonus', '0% Making Charges on Gold Jewellery']
  });

  // Edit Modal
  const [editingScheme, setEditingScheme] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual Slot Booking Modal
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingName, setBookingName] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [inspectedMember, setInspectedMember] = useState(null);

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedScheme || !bookingSlot || !bookingPhone.trim()) {
      alert('Please enter a valid mobile number');
      return;
    }
    setBookingSubmitting(true);
    try {
      await api.manualEnroll({
        schemeId: selectedScheme._id,
        tokenNumber: bookingSlot,
        phone: bookingPhone.trim(),
        name: bookingName.trim() || undefined
      });
      alert(`Chit slot #${bookingSlot} successfully allocated!`);
      setBookingSlot(null);
      setBookingPhone('');
      setBookingName('');
      // Reload slot grid & schemes list
      const data = await api.getMemberships({ schemeId: selectedScheme._id, limit: 200 });
      setSchemeMembers(data?.memberships || []);
      loadSchemes();
    } catch (err) {
      alert(err.message || 'Failed to allocate slot.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await api.getSchemes();
      setSchemes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  const handleInspectSlots = async (scheme) => {
    setSelectedScheme(scheme);
    setSlotsLoading(true);
    try {
      const data = await api.getMemberships({ schemeId: scheme._id, limit: 200 });
      setSchemeMembers(data?.memberships || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Create Scheme handlers
  const handleDurationChange = (months, isEdit = false) => {
    const parsed = parseInt(months, 10) || 1;
    if (isEdit) {
      const monthly = parseInt(editFormData.monthlyInstallment, 10) || 0;
      setEditFormData({
        ...editFormData,
        durationMonths: parsed,
        targetAmount: monthly * parsed
      });
    } else {
      const monthly = parseInt(newScheme.monthlyInstallment, 10) || 0;
      setNewScheme({
        ...newScheme,
        durationMonths: parsed,
        targetAmount: monthly * parsed
      });
    }
  };

  const handleMonthlyChange = (amount, isEdit = false) => {
    const parsed = parseInt(amount, 10) || 0;
    if (isEdit) {
      const duration = parseInt(editFormData.durationMonths, 10) || 12;
      setEditFormData({
        ...editFormData,
        monthlyInstallment: parsed,
        targetAmount: parsed * duration,
        bonusAmount: parsed
      });
    } else {
      const duration = parseInt(newScheme.durationMonths, 10) || 12;
      setNewScheme({
        ...newScheme,
        monthlyInstallment: parsed,
        targetAmount: parsed * duration,
        bonusAmount: parsed
      });
    }
  };

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    try {
      const duration = parseInt(newScheme.durationMonths, 10) || 12;
      const slots = Math.min(100, Math.max(1, parseInt(newScheme.totalSlots, 10) || 50));
      const cleanBenefits = (newScheme.benefits || []).map(b => b.trim()).filter(Boolean);

      await api.createScheme({
        ...newScheme,
        durationMonths: duration,
        totalSlots: slots,
        maxCapacity: slots,
        monthlyInstallment: parseInt(newScheme.monthlyInstallment, 10),
        targetAmount: parseInt(newScheme.targetAmount, 10),
        bonusAmount: parseInt(newScheme.bonusAmount, 10) || 0,
        benefits: cleanBenefits.length > 0 ? cleanBenefits : ['Guaranteed Scheme Bonus', '0% Making Charges']
      });

      setShowCreateModal(false);
      loadSchemes();
    } catch (err) {
      alert(err.message || 'Failed to create scheme.');
    }
  };

  // Open Edit Modal
  const openEditModal = (scheme) => {
    setEditingScheme(scheme);
    setEditFormData({
      name: scheme.name || '',
      monthlyInstallment: scheme.monthlyInstallment || 0,
      targetAmount: scheme.targetAmount || 0,
      durationMonths: scheme.durationMonths || 12,
      totalSlots: scheme.totalSlots || 50,
      bonusAmount: scheme.bonusAmount || 0,
      status: scheme.status || 'OPEN',
      benefits: Array.isArray(scheme.benefits) && scheme.benefits.length > 0 
        ? [...scheme.benefits] 
        : ['Guaranteed 12th Month Bonus', '0% Making Charges on Gold Jewellery']
    });
  };

  // Save Edit Scheme
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingScheme) return;
    setSavingEdit(true);
    try {
      const duration = parseInt(editFormData.durationMonths, 10) || 12;
      const slots = Math.min(100, Math.max(1, parseInt(editFormData.totalSlots, 10) || 50));
      const cleanBenefits = (editFormData.benefits || []).map(b => b.trim()).filter(Boolean);

      await api.updateScheme(editingScheme._id, {
        name: editFormData.name,
        durationMonths: duration,
        monthlyInstallment: parseInt(editFormData.monthlyInstallment, 10),
        targetAmount: parseInt(editFormData.targetAmount, 10),
        totalSlots: slots,
        maxCapacity: slots,
        bonusAmount: parseInt(editFormData.bonusAmount, 10) || 0,
        status: editFormData.status,
        benefits: cleanBenefits
      });

      setEditingScheme(null);
      setEditFormData(null);
      loadSchemes();
    } catch (err) {
      alert(err.message || 'Failed to update scheme.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Benefits handlers for Create
  const updateCreateBenefit = (idx, value) => {
    const updated = [...newScheme.benefits];
    updated[idx] = value;
    setNewScheme({ ...newScheme, benefits: updated });
  };

  const removeCreateBenefit = (idx) => {
    const updated = newScheme.benefits.filter((_, i) => i !== idx);
    setNewScheme({ ...newScheme, benefits: updated });
  };

  const addCreateBenefit = (text = '') => {
    setNewScheme({ ...newScheme, benefits: [...newScheme.benefits, text] });
  };

  // Benefits handlers for Edit
  const updateEditBenefit = (idx, value) => {
    const updated = [...editFormData.benefits];
    updated[idx] = value;
    setEditFormData({ ...editFormData, benefits: updated });
  };

  const removeEditBenefit = (idx) => {
    const updated = editFormData.benefits.filter((_, i) => i !== idx);
    setEditFormData({ ...editFormData, benefits: updated });
  };

  const addEditBenefit = (text = '') => {
    setEditFormData({ ...editFormData, benefits: [...editFormData.benefits, text] });
  };

  const occupiedTokenMap = {};
  schemeMembers.forEach(m => {
    occupiedTokenMap[m.tokenNumber] = m;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Gold Savings Schemes & Slots Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure flexible duration (3, 4, 6, 12+ months), custom slots (1–100), and customer benefit lines.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadSchemes}
            className="flex items-center space-x-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 bg-yellow-500 hover:bg-yellow-600 text-green-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Launch New Scheme</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-gray-400 text-xs py-8">Loading schemes...</div>
        ) : schemes.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">No schemes found</p>
            <p className="text-xs text-gray-400 mt-1">Click "Launch New Scheme" to create one.</p>
          </div>
        ) : (
          schemes.map((s) => {
            const slotsCount = s.totalSlots || 50;
            const fillPct = Math.min(100, Math.round(((s.enrolledCount || 0) / slotsCount) * 100));
            const duration = s.durationMonths || 12;

            return (
              <div key={s._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between hover:border-yellow-300 transition-all">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="pr-2">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{s.name}</h3>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Clock size={10} className="mr-1" />
                          {duration} Months Plan
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Layers size={10} className="mr-1" />
                          {slotsCount} Slots
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(s)}
                        title="Edit Scheme, Slots & Benefits"
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        s.status === 'ONGOING' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="text-[11px] text-gray-500">Monthly EMI</div>
                      <div className="text-base font-bold text-yellow-700 mt-0.5">
                        ₹{s.monthlyInstallment?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="text-[11px] text-gray-500">Target Value</div>
                      <div className="text-base font-bold text-gray-900 mt-0.5">
                        ₹{s.targetAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Token Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Tokens Claimed</span>
                      <span className="font-bold text-gray-900">{s.enrolledCount || 0} / {slotsCount}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${fillPct}%` }}></div>
                    </div>
                  </div>

                  {/* Benefits Lines */}
                  <div className="space-y-1.5 mb-5">
                    {s.benefits && s.benefits.length > 0 ? (
                      s.benefits.slice(0, 3).map((b, idx) => (
                        <div key={idx} className="flex items-start text-xs text-gray-700">
                          <Check size={13} className="text-emerald-600 mr-1.5 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{b}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400 italic">No custom benefits specified</div>
                    )}
                    {s.benefits && s.benefits.length > 3 && (
                      <div className="text-[10px] text-gray-500 font-medium pl-4">
                        +{s.benefits.length - 3} more benefits
                      </div>
                    )}
                  </div>
                </div>

                {/* Inspect Grid Button */}
                <button
                  onClick={() => handleInspectSlots(s)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Inspect 01–{slotsCount} Slots Grid</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Grid Inspector Modal (1 to 100 slots) */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedScheme.name} - 01–{selectedScheme.totalSlots || 50} Chit Grid
                </h3>
                <p className="text-xs text-gray-500">
                  Atomic allocation status of all {selectedScheme.totalSlots || 50} slots ({selectedScheme.durationMonths || 12} Months Plan)
                </p>
              </div>
              <button
                onClick={() => setSelectedScheme(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center space-x-4 mb-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400"></div>
                <span className="text-gray-600">Available</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-400"></div>
                <span className="text-gray-600">Occupied</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-gray-600">Draw Winner</span>
              </div>
            </div>

            {slotsLoading ? (
              <div className="text-center py-8 text-gray-400 text-xs">Loading chit tokens...</div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">
                  💡 Tip: Click on any green <span className="font-bold text-emerald-700">Available</span> slot to book it directly for a patron, or click an <span className="font-bold text-amber-800">Occupied</span> slot to view patron details.
                </p>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-4">
                  {Array.from({ length: selectedScheme.totalSlots || 50 }, (_, i) => i + 1).map((num) => {
                    const member = occupiedTokenMap[num];
                    const isWinner = member?.status === 'WINNER';
                    const isOccupied = !!member;
                    const isBeingBooked = bookingSlot === num;

                    return (
                      <button
                        type="button"
                        key={num}
                        onClick={() => {
                          if (isOccupied) {
                            setInspectedMember({ num, member });
                            setBookingSlot(null);
                          } else {
                            setBookingSlot(num);
                            setBookingPhone('');
                            setBookingName('');
                            setInspectedMember(null);
                          }
                        }}
                        className={`aspect-square flex items-center justify-center rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                          isBeingBooked ? 'ring-2 ring-emerald-600 bg-emerald-600 text-white scale-105 shadow-md' :
                          isWinner ? 'bg-yellow-500 text-green-950 font-black shadow-xs hover:brightness-105' :
                          isOccupied ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200' :
                          'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 hover:border-emerald-500'
                        }`}
                        title={member ? `Token #${num}: ${member.userId?.name || 'Customer'}` : `Click to book Token #${num}`}
                      >
                        {String(num).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                {/* Booking Panel when Available Slot is selected */}
                {bookingSlot && (
                  <form onSubmit={handleConfirmBooking} className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-300 mb-3 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold font-mono">
                          {String(bookingSlot).padStart(2, '0')}
                        </span>
                        <h4 className="text-sm font-bold text-emerald-950">
                          Book Chit Slot #{bookingSlot} for Patron
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingSlot(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Patron Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={bookingPhone}
                          onChange={(e) => setBookingPhone(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Patron Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={bookingName}
                          onChange={(e) => setBookingName(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-emerald-800 font-medium">
                        Monthly EMI: <strong>₹{(selectedScheme.monthlyInstallment || 0).toLocaleString('en-IN')}</strong> • Duration: {selectedScheme.durationMonths || 12}M
                      </div>
                      <button
                        type="submit"
                        disabled={bookingSubmitting}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        {bookingSubmitting ? 'Allocating...' : `Confirm & Allocate Slot #${bookingSlot}`}
                      </button>
                    </div>
                  </form>
                )}

                {/* Inspected Occupied Slot Member Details */}
                {inspectedMember && (
                  <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-300 mb-3 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                          {String(inspectedMember.num).padStart(2, '0')}
                        </span>
                        <h4 className="text-sm font-bold text-amber-950">
                          Chit Slot #{inspectedMember.num} ({inspectedMember.member.chitToken || `#SW-${String(inspectedMember.num).padStart(3, '0')}`})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedMember(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] block">Patron Name</span>
                        <span className="font-semibold text-gray-900">{inspectedMember.member.userId?.name || 'Patron'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">Phone</span>
                        <span className="font-semibold text-gray-900">{inspectedMember.member.userId?.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">Status</span>
                        <span className="font-bold text-amber-800">{inspectedMember.member.status || 'ACTIVE'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">Total Paid</span>
                        <span className="font-bold text-emerald-700">₹{(inspectedMember.member.totalPaidAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setSelectedScheme(null);
                  setBookingSlot(null);
                  setInspectedMember(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Scheme Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Launch New Gold Scheme</h3>
                <p className="text-xs text-gray-500">Configure duration, total slots (1–100), and custom benefits.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateScheme} className="space-y-4">
              {/* Scheme Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Scheme Title</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={newScheme.name}
                  onChange={(e) => setNewScheme({ ...newScheme, name: e.target.value })}
                  placeholder="e.g. Swastik Suvarna Varsha 10K"
                  required
                />
              </div>

              {/* Duration in Months */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Scheme Duration (Months)</label>
                  <span className="text-[11px] font-bold text-yellow-700">{newScheme.durationMonths} Months</span>
                </div>
                <div className="flex items-center space-x-1.5 mb-2">
                  {DURATION_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleDurationChange(m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        parseInt(newScheme.durationMonths, 10) === m
                          ? 'bg-yellow-500 text-green-950 border-yellow-500'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Or custom months:</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                    value={newScheme.durationMonths}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    required
                  />
                  <span className="text-xs text-gray-500">months</span>
                </div>
              </div>

              {/* Financials: Monthly EMI & Target Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={newScheme.monthlyInstallment}
                    onChange={(e) => handleMonthlyChange(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Value (₹)</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                    value={newScheme.targetAmount}
                    onChange={(e) => setNewScheme({ ...newScheme, targetAmount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Total Slots (1 to 100) & Bonus Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Total Slots (1–100)</label>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                    value={newScheme.totalSlots}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1));
                      setNewScheme({ ...newScheme, totalSlots: val, maxCapacity: val });
                    }}
                    required
                  />
                  <div className="flex items-center space-x-1 mt-1.5">
                    {SLOT_PRESETS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewScheme({ ...newScheme, totalSlots: s, maxCapacity: s })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                          parseInt(newScheme.totalSlots, 10) === s
                            ? 'bg-yellow-100 text-yellow-900 border-yellow-300 font-bold'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bonus Month (₹)</label>
                  <input
                    type="number"
                    step="500"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={newScheme.bonusAmount}
                    onChange={(e) => setNewScheme({ ...newScheme, bonusAmount: e.target.value })}
                    placeholder="e.g. 10000"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Sponsor/bonus amount given at maturity</p>
                </div>
              </div>

              {/* Benefits Editor */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-900">
                    Scheme Benefits & Highlights
                  </label>
                  <button
                    type="button"
                    onClick={() => addCreateBenefit('')}
                    className="flex items-center space-x-1 text-xs text-yellow-700 hover:text-yellow-800 font-semibold cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Line</span>
                  </button>
                </div>

                <div className="space-y-2 mb-2">
                  {newScheme.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <div className="w-5 flex justify-center text-emerald-600 flex-shrink-0">
                        <Check size={14} />
                      </div>
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        value={benefit}
                        onChange={(e) => updateCreateBenefit(idx, e.target.value)}
                        placeholder={`e.g. Guaranteed ${newScheme.durationMonths}th Month Bonus`}
                      />
                      <button
                        type="button"
                        onClick={() => removeCreateBenefit(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer rounded"
                        title="Remove benefit line"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Suggestions */}
                <div className="mt-2 pt-2 border-t border-gray-50">
                  <span className="text-[11px] text-gray-500 font-medium block mb-1">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_BENEFITS.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (!newScheme.benefits.includes(sug)) {
                            addCreateBenefit(sug);
                          }
                        }}
                        className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-green-950 bg-yellow-500 hover:bg-yellow-600 shadow-sm cursor-pointer"
                >
                  Create Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scheme Modal */}
      {editingScheme && editFormData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Scheme: {editingScheme.name}</h3>
                <p className="text-xs text-gray-500">Update duration, slots (1–100), status, and customer benefit lines.</p>
              </div>
              <button
                onClick={() => setEditingScheme(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Scheme Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Scheme Title</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Scheme Status</label>
                <select
                  className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="OPEN">OPEN (Accepting New Enrollments)</option>
                  <option value="ONGOING">ONGOING (In Progress / Locked)</option>
                  <option value="COMPLETED">COMPLETED (Matured / Closed)</option>
                </select>
              </div>

              {/* Duration in Months */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Scheme Duration (Months)</label>
                  <span className="text-[11px] font-bold text-yellow-700">{editFormData.durationMonths} Months</span>
                </div>
                <div className="flex items-center space-x-1.5 mb-2">
                  {DURATION_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleDurationChange(m, true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        parseInt(editFormData.durationMonths, 10) === m
                          ? 'bg-yellow-500 text-green-950 border-yellow-500'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Or custom months:</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                    value={editFormData.durationMonths}
                    onChange={(e) => handleDurationChange(e.target.value, true)}
                    required
                  />
                  <span className="text-xs text-gray-500">months</span>
                </div>
              </div>

              {/* Financials: Monthly EMI & Target Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={editFormData.monthlyInstallment}
                    onChange={(e) => handleMonthlyChange(e.target.value, true)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Value (₹)</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                    value={editFormData.targetAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, targetAmount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Total Slots (1 to 100) & Bonus Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Total Slots (1–100)</label>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold"
                    value={editFormData.totalSlots}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1));
                      setEditFormData({ ...editFormData, totalSlots: val });
                    }}
                    required
                  />
                  <div className="flex items-center space-x-1 mt-1.5">
                    {SLOT_PRESETS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, totalSlots: s })}
                        className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                          parseInt(editFormData.totalSlots, 10) === s
                            ? 'bg-yellow-100 text-yellow-900 border-yellow-300 font-bold'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bonus Month (₹)</label>
                  <input
                    type="number"
                    step="500"
                    className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={editFormData.bonusAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, bonusAmount: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Sponsor/bonus amount given at maturity</p>
                </div>
              </div>

              {/* Editable Benefits List */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-900">
                    Scheme Benefits & Highlights
                  </label>
                  <button
                    type="button"
                    onClick={() => addEditBenefit('')}
                    className="flex items-center space-x-1 text-xs text-yellow-700 hover:text-yellow-800 font-semibold cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Line</span>
                  </button>
                </div>

                <div className="space-y-2 mb-2">
                  {editFormData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <div className="w-5 flex justify-center text-emerald-600 flex-shrink-0">
                        <Check size={14} />
                      </div>
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        value={benefit}
                        onChange={(e) => updateEditBenefit(idx, e.target.value)}
                        placeholder="e.g. Guaranteed 12th Month Bonus"
                      />
                      <button
                        type="button"
                        onClick={() => removeEditBenefit(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer rounded"
                        title="Remove benefit line"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Suggestions */}
                <div className="mt-2 pt-2 border-t border-gray-50">
                  <span className="text-[11px] text-gray-500 font-medium block mb-1">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_BENEFITS.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (!editFormData.benefits.includes(sug)) {
                            addEditBenefit(sug);
                          }
                        }}
                        className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingScheme(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-green-950 bg-yellow-500 hover:bg-yellow-600 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Scheme Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
