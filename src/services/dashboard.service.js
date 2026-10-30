import { Membership, Payment, GoldRate } from '../models/index.js';

/**
 * Builds an aggregated scheme dashboard for a user's enrollment in a single scheme.
 * Aggregates multiple tokens/slots into a single consolidated plan.
 */
function buildAggregatedSchemeDashboard({ scheme, memberships, payments, rate24k, totalActiveSchemes }) {
  // Sort memberships by tokenNumber ascending
  memberships.sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));

  const primaryMembership = memberships[0];
  const slotCount = memberships.length;
  const tokenNumbers = memberships.map(m => m.tokenNumber);
  const tokenChits = memberships.map(m => m.chitToken || `#SW-${String(m.tokenNumber).padStart(3, '0')}`);

  // Format Chit Token label
  let chitToken = '';
  if (slotCount === 1) {
    chitToken = tokenChits[0];
  } else if (slotCount <= 4) {
    chitToken = `${slotCount} Tokens (${tokenChits.join(', ')})`;
  } else {
    const isConsecutive = tokenNumbers.every((num, idx) => idx === 0 || num === tokenNumbers[idx - 1] + 1);
    if (isConsecutive) {
      chitToken = `${slotCount} Tokens (${tokenChits[0]} – ${tokenChits[tokenChits.length - 1]})`;
    } else {
      chitToken = `${slotCount} Tokens (${tokenChits.slice(0, 3).join(', ')}...)`;
    }
  }

  // Financial amounts across all slots
  const totalMonthlyEmi = memberships.reduce((sum, m) => sum + (m.customMonthlyEmi || scheme.monthlyInstallment), 0);
  const totalTargetAmount = memberships.reduce((sum, m) => sum + (m.targetAmount || scheme.targetAmount), 0);
  const bonusPerSlot = scheme.hasBonusMonth ? (scheme.bonusAmount || scheme.monthlyInstallment) : 0;
  const totalBonusAmount = bonusPerSlot * slotCount;

  // Payments aggregation
  let totalPaidAmount = 0;
  let accumulatedGoldGrams = 0;
  const monthPaidAmountMap = new Map();
  const paymentDetailsMap = new Map();

  for (const p of payments) {
    const coveredMonths = p.monthsPaid && p.monthsPaid.length > 0 ? p.monthsPaid : [p.monthFor];
    for (const m of coveredMonths) {
      monthPaidAmountMap.set(m, (monthPaidAmountMap.get(m) || 0) + p.amount);
      if (!paymentDetailsMap.has(m)) {
        paymentDetailsMap.set(m, p);
      }
    }
    totalPaidAmount += p.amount;
    accumulatedGoldGrams += p.goldGrams || 0;
  }

  accumulatedGoldGrams = parseFloat(accumulatedGoldGrams.toFixed(3));
  const currentValuation = Math.round(accumulatedGoldGrams * rate24k);
  const valuationGainPct = totalPaidAmount > 0
    ? parseFloat((((currentValuation - totalPaidAmount) / totalPaidAmount) * 100).toFixed(2))
    : 0.0;

  const netCustomerPayable = Math.max(0, totalTargetAmount - totalBonusAmount);
  const remainingAmount = Math.max(0, netCustomerPayable - totalPaidAmount);

  // Determine months paid and next payable month
  const lastCustomerMonth = scheme.hasBonusMonth ? scheme.durationMonths - 1 : scheme.durationMonths;
  const minJoinedMonth = Math.min(...memberships.map(m => m.joinedAtMonth || 1));

  let monthsPaidCount = 0;
  let nextPayableMonth = null;

  for (let m = minJoinedMonth; m <= lastCustomerMonth; m++) {
    const paidForMonth = monthPaidAmountMap.get(m) || 0;
    if (paidForMonth >= totalMonthlyEmi) {
      monthsPaidCount++;
    } else if (nextPayableMonth === null) {
      nextPayableMonth = m;
    }
  }

  const today = new Date();
  const nextDueDate = new Date(today.getFullYear(), today.getMonth(), 15);
  if (nextDueDate < today) {
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  }
  const daysRemaining = Math.max(0, Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24)));

  const nextInstallment = nextPayableMonth ? {
    month: nextPayableMonth,
    amount: totalMonthlyEmi,
    dueDate: nextDueDate.toISOString(),
    daysRemaining
  } : null;

  // Synthesize passbook for this scheme
  const passbook = [];
  for (let m = 1; m <= scheme.durationMonths; m++) {
    const label = `Month ${m}`;
    const baseDate = primaryMembership.createdAt ? new Date(primaryMembership.createdAt) : new Date();
    const instDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (m - 1), 15);
    const monthName = instDate.toLocaleString('en-US', { month: 'short' });

    if (m < minJoinedMonth) {
      passbook.push({
        month: m,
        monthName,
        label,
        amount: totalMonthlyEmi,
        status: 'PRE_JOIN',
        note: `Scheme joined in Month ${minJoinedMonth}; custom installment applied`
      });
      continue;
    }

    if (m === scheme.durationMonths && scheme.hasBonusMonth) {
      passbook.push({
        month: m,
        monthName,
        label,
        amount: totalBonusAmount,
        status: 'BONUS',
        bonusNote: '100% Jeweler Bonus Deposit on completion'
      });
      continue;
    }

    const paidForMonth = monthPaidAmountMap.get(m) || 0;
    if (paidForMonth > 0) {
      const p = paymentDetailsMap.get(m);
      passbook.push({
        month: m,
        monthName,
        label,
        amount: paidForMonth,
        status: paidForMonth >= totalMonthlyEmi ? 'PAID' : 'PARTIAL',
        paidAt: p?.paidAt ? p.paidAt.toISOString() : p?.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        paymentMethod: p?.paymentMethod || 'ONLINE',
        transactionId: p?.transactionId || `TXN-SW-${p?._id?.toString().slice(-5).toUpperCase()}`,
        goldGrams: p?.goldGrams || 0,
        receiptUrl: p?.receiptUrl || `https://res.cloudinary.com/swastik/image/upload/receipts/rec_${p?._id}.pdf`
      });
      continue;
    }

    if (m === nextPayableMonth) {
      passbook.push({
        month: m,
        monthName,
        label,
        amount: totalMonthlyEmi,
        status: 'CURRENT',
        dueDate: nextDueDate.toISOString()
      });
      continue;
    }

    const monthOffset = m - (nextPayableMonth || 1);
    const upcomingDueDate = new Date(nextDueDate);
    upcomingDueDate.setMonth(upcomingDueDate.getMonth() + monthOffset);

    passbook.push({
      month: m,
      monthName,
      label,
      amount: totalMonthlyEmi,
      status: 'UPCOMING',
      dueDate: upcomingDueDate.toISOString()
    });
  }

  const startDate = (primaryMembership.createdAt || new Date()).toISOString();
  const endDate = new Date(new Date(primaryMembership.createdAt || Date.now()).setMonth(new Date(primaryMembership.createdAt || Date.now()).getMonth() + scheme.durationMonths)).toISOString();

  return {
    hasActiveScheme: true,
    totalActiveSchemes,
    dashboard: {
      membershipId: primaryMembership._id.toString(),
      chitToken,
      kittyNumber: primaryMembership.kittyNumber || primaryMembership.tokenNumber,
      tokenCount: slotCount,
      tokens: tokenChits,
      schemeName: scheme.name,
      targetAmount: totalTargetAmount,
      customMonthlyEmi: totalMonthlyEmi,
      totalMonths: scheme.durationMonths,
      monthsPaid: monthsPaidCount,
      totalPaidAmount,
      remainingAmount,
      accumulatedGoldGrams,
      currentValuation,
      valuationGainPct,
      nextInstallment,
      startDate,
      endDate,
      passbook
    }
  };
}

/**
 * Returns single primary active scheme dashboard for the patron.
 */
export const synthesizeDashboard = async (userId) => {
  const allDashboards = await synthesizeAllDashboards(userId);
  if (!allDashboards || allDashboards.length === 0) {
    return {
      hasActiveScheme: false,
      totalActiveSchemes: 0,
      dashboard: null,
      memberships: []
    };
  }
  return allDashboards[0];
};

/**
 * Returns aggregated dashboards grouped by scheme for the patron.
 * Patrons holding multiple slots in the same scheme will see a single unified
 * scheme dashboard reflecting the combined token count, EMI, and target amount.
 */
export const synthesizeAllDashboards = async (userId) => {
  const activeMemberships = await Membership.find({
    userId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  }).populate('schemeId').sort({ tokenNumber: 1 });

  if (!activeMemberships || activeMemberships.length === 0) {
    return [{
      hasActiveScheme: false,
      totalActiveSchemes: 0,
      dashboard: null,
      memberships: []
    }];
  }

  // Group memberships by schemeId
  const schemeMap = new Map();
  for (const mem of activeMemberships) {
    if (!mem.schemeId) continue;
    const sId = mem.schemeId._id.toString();
    if (!schemeMap.has(sId)) {
      schemeMap.set(sId, {
        scheme: mem.schemeId,
        memberships: []
      });
    }
    schemeMap.get(sId).memberships.push(mem);
  }

  if (schemeMap.size === 0) {
    return [{
      hasActiveScheme: false,
      totalActiveSchemes: 0,
      dashboard: null,
      memberships: []
    }];
  }

  const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
  const rate24k = latestRate ? latestRate.rate24k : 7485.50;

  const totalUniqueSchemes = schemeMap.size;
  const dashboards = [];

  for (const { scheme, memberships } of schemeMap.values()) {
    const membershipIds = memberships.map(m => m._id);
    const payments = await Payment.find({
      membershipId: { $in: membershipIds },
      status: 'SUCCESS'
    }).sort({ monthFor: 1 });

    const schemeDash = buildAggregatedSchemeDashboard({
      scheme,
      memberships,
      payments,
      rate24k,
      totalActiveSchemes: totalUniqueSchemes
    });

    dashboards.push(schemeDash);
  }

  return dashboards;
};
