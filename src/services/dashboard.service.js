import { Membership, Payment, GoldRate } from '../models/index.js';

export const synthesizeDashboard = async (userId) => {
  const activeMemberships = await Membership.find({
    userId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  }).populate('schemeId');

  if (!activeMemberships || activeMemberships.length === 0 || !activeMemberships[0].schemeId) {
    return {
      hasActiveScheme: false,
      totalActiveSchemes: 0,
      dashboard: null,
      memberships: []
    };
  }

  const membership = activeMemberships[0];
  const scheme = membership.schemeId;

  // Retrieve all successful payments
  const payments = await Payment.find({
    membershipId: membership._id,
    status: 'SUCCESS'
  }).sort({ monthFor: 1 });

  const paymentMap = new Map();
  let totalPaidAmount = 0;
  let accumulatedGoldGrams = 0;

  for (const p of payments) {
    const coveredMonths = p.monthsPaid && p.monthsPaid.length > 0 ? p.monthsPaid : [p.monthFor];
    for (const m of coveredMonths) {
      paymentMap.set(m, p);
    }
    totalPaidAmount += p.amount;
    accumulatedGoldGrams += p.goldGrams || 0;
  }

  accumulatedGoldGrams = parseFloat(accumulatedGoldGrams.toFixed(3));

  // Get current benchmark gold rate
  const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
  const rate24k = latestRate ? latestRate.rate24k : 7485.50;

  const currentValuation = Math.round(accumulatedGoldGrams * rate24k);
  const valuationGainPct = totalPaidAmount > 0
    ? parseFloat((((currentValuation - totalPaidAmount) / totalPaidAmount) * 100).toFixed(2))
    : 0.0;

  const effectiveBonus = scheme.hasBonusMonth ? scheme.bonusAmount : 0;
  const netCustomerPayable = Math.max(0, scheme.targetAmount - effectiveBonus);
  const remainingAmount = Math.max(0, netCustomerPayable - totalPaidAmount);

  const monthsPaid = payments.length;

  // Find next payable month (>= joinedAtMonth and not yet paid, excluding bonus month)
  const lastCustomerMonth = scheme.hasBonusMonth ? scheme.durationMonths - 1 : scheme.durationMonths;
  let nextPayableMonth = null;

  for (let m = membership.joinedAtMonth; m <= lastCustomerMonth; m++) {
    if (!paymentMap.has(m)) {
      nextPayableMonth = m;
      break;
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
    amount: membership.customMonthlyEmi,
    dueDate: nextDueDate.toISOString(),
    daysRemaining
  } : null;

  // Synthesize 12-month passbook
  const passbook = [];

  for (let m = 1; m <= scheme.durationMonths; m++) {
    const label = `Month ${m}`;
    const baseDate = membership.createdAt ? new Date(membership.createdAt) : new Date();
    const instDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (m - 1), 15);
    const monthName = instDate.toLocaleString('en-US', { month: 'short' });

    // 1. Months before user joined (Late Joiners)
    if (m < membership.joinedAtMonth) {
      passbook.push({
        month: m,
        monthName,
        label,
        amount: membership.customMonthlyEmi,
        status: 'PRE_JOIN',
        note: `Scheme joined in Month ${membership.joinedAtMonth}; custom installment applied`
      });
      continue;
    }

    // 2. Month 12: Jeweler 100% Bonus
    if (m === scheme.durationMonths && scheme.hasBonusMonth) {
      passbook.push({
        month: m,
        monthName,
        label,
        amount: scheme.bonusAmount,
        status: 'BONUS',
        bonusNote: '100% Jeweler Bonus Deposit on completion'
      });
      continue;
    }

    // 3. Paid Month
    if (paymentMap.has(m)) {
      const p = paymentMap.get(m);
      passbook.push({
        month: m,
        monthName,
        label,
        amount: p.amount,
        status: 'PAID',
        paidAt: p.paidAt ? p.paidAt.toISOString() : p.createdAt.toISOString(),
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId || `TXN-SW-${p._id.toString().slice(-5).toUpperCase()}`,
        goldGrams: p.goldGrams || 0,
        receiptUrl: p.receiptUrl || `https://res.cloudinary.com/swastik/image/upload/receipts/rec_${p._id}.pdf`
      });
      continue;
    }

    // 4. Current Month Due
    if (m === nextPayableMonth) {
      passbook.push({
        month: m,
        monthName,
        label,
        amount: membership.customMonthlyEmi,
        status: 'CURRENT',
        dueDate: nextDueDate.toISOString()
      });
      continue;
    }

    // 5. Future Upcoming Months
    const monthOffset = m - (nextPayableMonth || 1);
    const upcomingDueDate = new Date(nextDueDate);
    upcomingDueDate.setMonth(upcomingDueDate.getMonth() + monthOffset);

    passbook.push({
      month: m,
      monthName,
      label,
      amount: membership.customMonthlyEmi,
      status: 'UPCOMING',
      dueDate: upcomingDueDate.toISOString()
    });
  }

  const summaryMemberships = activeMemberships.map(m => ({
    id: m._id.toString(),
    schemeId: m.schemeId._id.toString(),
    schemeName: m.schemeId.name,
    tokenNumber: m.tokenNumber,
    kittyNumber: m.kittyNumber || m.tokenNumber,
    chitToken: m.chitToken,
    targetAmount: m.targetAmount,
    totalPaidAmount: m.totalPaidAmount,
    customMonthlyEmi: m.customMonthlyEmi,
    status: m.status
  }));

  const startDate = (membership.createdAt || new Date()).toISOString();
  const endDate = new Date(new Date(membership.createdAt || Date.now()).setMonth(new Date(membership.createdAt || Date.now()).getMonth() + scheme.durationMonths)).toISOString();

  return {
    hasActiveScheme: true,
    totalActiveSchemes: activeMemberships.length,
    dashboard: {
      membershipId: membership._id.toString(),
      chitToken: membership.chitToken,
      kittyNumber: membership.kittyNumber || membership.tokenNumber,
      schemeName: scheme.name,
      targetAmount: scheme.targetAmount,
      customMonthlyEmi: membership.customMonthlyEmi,
      totalMonths: scheme.durationMonths,
      monthsPaid,
      totalPaidAmount,
      remainingAmount,
      accumulatedGoldGrams,
      currentValuation,
      valuationGainPct,
      nextInstallment,
      startDate,
      endDate,
      passbook
    },
    memberships: summaryMemberships
  };
};

export const synthesizeAllDashboards = async (userId) => {
  const activeMemberships = await Membership.find({
    userId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  }).populate('schemeId');

  if (!activeMemberships || activeMemberships.length === 0) {
    return [{
      hasActiveScheme: false,
      totalActiveSchemes: 0,
      dashboard: null,
      memberships: []
    }];
  }

  const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
  const rate24k = latestRate ? latestRate.rate24k : 7485.50;

  const dashboards = [];

  for (const membership of activeMemberships) {
    if (!membership.schemeId) continue;
    const scheme = membership.schemeId;

    const payments = await Payment.find({
      membershipId: membership._id,
      status: 'SUCCESS'
    }).sort({ monthFor: 1 });

    const paymentMap = new Map();
    let totalPaidAmount = 0;
    let accumulatedGoldGrams = 0;

    for (const p of payments) {
      const coveredMonths = p.monthsPaid && p.monthsPaid.length > 0 ? p.monthsPaid : [p.monthFor];
      for (const m of coveredMonths) {
        paymentMap.set(m, p);
      }
      totalPaidAmount += p.amount;
      accumulatedGoldGrams += p.goldGrams || 0;
    }

    accumulatedGoldGrams = parseFloat(accumulatedGoldGrams.toFixed(3));
    const currentValuation = Math.round(accumulatedGoldGrams * rate24k);
    const valuationGainPct = totalPaidAmount > 0
      ? parseFloat((((currentValuation - totalPaidAmount) / totalPaidAmount) * 100).toFixed(2))
      : 0.0;

    const effectiveBonus = scheme.hasBonusMonth ? scheme.bonusAmount : 0;
    const netCustomerPayable = Math.max(0, scheme.targetAmount - effectiveBonus);
    const remainingAmount = Math.max(0, netCustomerPayable - totalPaidAmount);
    const monthsPaid = payments.length;

    const lastCustomerMonth = scheme.hasBonusMonth ? scheme.durationMonths - 1 : scheme.durationMonths;
    let nextPayableMonth = null;

    for (let m = membership.joinedAtMonth; m <= lastCustomerMonth; m++) {
      if (!paymentMap.has(m)) {
        nextPayableMonth = m;
        break;
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
      amount: membership.customMonthlyEmi,
      dueDate: nextDueDate.toISOString(),
      daysRemaining
    } : null;

    const passbook = [];
    for (let m = 1; m <= scheme.durationMonths; m++) {
      const label = `Month ${m}`;
      const baseDate = membership.createdAt ? new Date(membership.createdAt) : new Date();
      const instDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (m - 1), 15);
      const monthName = instDate.toLocaleString('en-US', { month: 'short' });

      if (m < membership.joinedAtMonth) {
        passbook.push({
          month: m,
          monthName,
          label,
          amount: membership.customMonthlyEmi,
          status: 'PRE_JOIN',
          note: `Scheme joined in Month ${membership.joinedAtMonth}; custom installment applied`
        });
        continue;
      }
      if (m === scheme.durationMonths && scheme.hasBonusMonth) {
        passbook.push({
          month: m,
          monthName,
          label,
          amount: scheme.bonusAmount,
          status: 'BONUS',
          bonusNote: '100% Jeweler Bonus Deposit on completion'
        });
        continue;
      }
      if (paymentMap.has(m)) {
        const p = paymentMap.get(m);
        passbook.push({
          month: m,
          monthName,
          label,
          amount: p.amount,
          status: 'PAID',
          paidAt: p.paidAt ? p.paidAt.toISOString() : p.createdAt.toISOString(),
          paymentMethod: p.paymentMethod,
          transactionId: p.transactionId || `TXN-SW-${p._id.toString().slice(-5).toUpperCase()}`,
          goldGrams: p.goldGrams || 0,
          receiptUrl: p.receiptUrl || `https://res.cloudinary.com/swastik/image/upload/receipts/rec_${p._id}.pdf`
        });
        continue;
      }
      if (m === nextPayableMonth) {
        passbook.push({
          month: m,
          monthName,
          label,
          amount: membership.customMonthlyEmi,
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
        amount: membership.customMonthlyEmi,
        status: 'UPCOMING',
        dueDate: upcomingDueDate.toISOString()
      });
    }

    const startDate = (membership.createdAt || new Date()).toISOString();
    const endDate = new Date(new Date(membership.createdAt || Date.now()).setMonth(new Date(membership.createdAt || Date.now()).getMonth() + scheme.durationMonths)).toISOString();

    dashboards.push({
      hasActiveScheme: true,
      totalActiveSchemes: activeMemberships.length,
      dashboard: {
        membershipId: membership._id.toString(),
        chitToken: membership.chitToken,
        kittyNumber: membership.kittyNumber || membership.tokenNumber,
        schemeName: scheme.name,
        targetAmount: scheme.targetAmount,
        customMonthlyEmi: membership.customMonthlyEmi,
        totalMonths: scheme.durationMonths,
        monthsPaid,
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
    });
  }

  return dashboards;
};

