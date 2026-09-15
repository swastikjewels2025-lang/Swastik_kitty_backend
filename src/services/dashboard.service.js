import { Membership, Payment, GoldRate } from '../models/index.js';

export const synthesizeDashboard = async (userId) => {
  const membership = await Membership.findOne({
    userId,
    status: { $in: ['ACTIVE', 'WINNER'] }
  }).populate('schemeId');

  if (!membership || !membership.schemeId) {
    return {
      hasActiveScheme: false,
      dashboard: null
    };
  }

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
    paymentMap.set(p.monthFor, p);
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

    // 1. Months before user joined (Late Joiners)
    if (m < membership.joinedAtMonth) {
      passbook.push({
        month: m,
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
      label,
      amount: membership.customMonthlyEmi,
      status: 'UPCOMING',
      dueDate: upcomingDueDate.toISOString()
    });
  }

  return {
    hasActiveScheme: true,
    dashboard: {
      membershipId: membership._id.toString(),
      chitToken: membership.chitToken,
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
      passbook
    }
  };
};
