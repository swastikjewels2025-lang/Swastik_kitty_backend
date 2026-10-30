import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

export const LuckyDrawView = () => {
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [drawMonth, setDrawMonth] = useState(new Date().getMonth() + 1);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [winningToken, setWinningToken] = useState(null);
  const [winnerResult, setWinnerResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const data = await api.getSchemes();
        setSchemes(data || []);
        if (data && data.length > 0) {
          setSelectedSchemeId(data[0]._id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchemes();
  }, []);

  const loadEligible = async () => {
    if (!selectedSchemeId) return;
    setLoading(true);
    setError('');
    setWinnerResult(null);
    setWinningToken(null);
    try {
      const data = await api.getDrawEligible(selectedSchemeId);
      setEligibleMembers(data?.members || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch eligible participants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEligible();
  }, [selectedSchemeId]);

  const handleRunDraw = async () => {
    if (eligibleMembers.length === 0) {
      alert('No eligible members available for this draw.');
      return;
    }

    setDrawing(true);
    setError('');

    let counter = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
      setWinningToken(eligibleMembers[randomIndex].tokenNumber);
      counter++;
      if (counter > 25) {
        clearInterval(interval);
        finalizeDraw();
      }
    }, 90);

    const finalizeDraw = async () => {
      const finalWinner = eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)];
      setWinningToken(finalWinner.tokenNumber);

      try {
        const res = await api.recordDrawWinner({
          schemeId: selectedSchemeId,
          tokenNumber: finalWinner.tokenNumber,
          month: parseInt(drawMonth, 10)
        });
        setWinnerResult(res);
        loadEligible();
      } catch (err) {
        setError(err.message || 'Failed to record draw winner.');
      } finally {
        setDrawing(false);
      }
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Monthly Lucky Draw Selector</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Transparent monthly prize draw selector with automated winner passbook settlement.
        </p>
      </div>

      {/* Control Strip */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Kitty Scheme</label>
            <select
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              value={selectedSchemeId}
              onChange={(e) => setSelectedSchemeId(e.target.value)}
            >
              {schemes.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (₹{s.monthlyInstallment?.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Draw Month</label>
            <input
              type="number"
              min="1"
              max="12"
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              value={drawMonth}
              onChange={(e) => setDrawMonth(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Eligible Pool</label>
            <div className="px-3.5 py-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold text-yellow-800">
              {eligibleMembers.length} Active Chit Tokens
            </div>
          </div>

          <button
            onClick={handleRunDraw}
            disabled={drawing || eligibleMembers.length === 0}
            className="flex items-center justify-center space-x-1.5 bg-yellow-500 hover:bg-yellow-600 text-green-950 font-bold px-4 py-2.5 rounded-lg text-xs shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Trophy size={16} />
            <span>{drawing ? 'Spinning...' : 'Initiate Official Draw'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Winner Celebration Banner */}
      {winnerResult && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-300 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-yellow-500 text-green-950 font-bold text-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
            🏆
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            Congratulations to Month {winnerResult.winMonth} Winner!
          </h3>
          <div className="text-3xl font-black text-yellow-800 font-mono my-2">
            {winnerResult.chitToken || `#SW-00${winnerResult.tokenNumber}`}
          </div>
          <div className="text-sm font-semibold text-gray-800">
            Patron: {winnerResult.winnerName} ({winnerResult.winnerPhone})
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ✓ Status marked as WINNER • Future monthly installment obligation waived.
          </p>
        </div>
      )}

      {/* Token Pool */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-sm">Eligible Chit Participants</h3>
          <button
            onClick={loadEligible}
            className="flex items-center space-x-1 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'spin-anim' : ''} />
            <span>Reload</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">Loading participants...</div>
        ) : eligibleMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">No eligible active members in this scheme.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {eligibleMembers.map((m) => {
              const isSelected = winningToken === m.tokenNumber;
              return (
                <div
                  key={m._id}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'bg-yellow-500 text-green-950 font-black border-yellow-600 shadow-md scale-105'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="font-mono text-sm font-bold">
                    {m.chitToken || `#SW-00${m.tokenNumber}`}
                  </div>
                  <div className="text-[11px] truncate font-medium mt-0.5">
                    {m.userId?.name || 'Customer'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
