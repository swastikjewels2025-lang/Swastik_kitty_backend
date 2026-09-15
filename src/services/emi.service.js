/**
 * Dynamic EMI Calculation Engine
 * 
 * In an 11+1 savings scheme:
 * - Gross Target = targetAmount (e.g. ₹60,000)
 * - Bonus Amount = bonusAmount (e.g. ₹5,000 in Month 12 paid by Jeweler)
 * - Net Customer Payable = targetAmount - bonusAmount (₹55,000)
 * 
 * For Month 1 joiners: 11 payable months -> ₹55,000 / 11 = ₹5,000/month
 * For late joiners (e.g. Month 3): payable months are 3..11 = 9 months -> ₹55,000 / 9 = ₹6,111/month
 */
export const calculateDynamicEmi = ({
  targetAmount,
  durationMonths = 12,
  joinedAtMonth = 1,
  hasBonusMonth = true,
  bonusAmount = 5000
}) => {
  const effectiveBonus = hasBonusMonth ? bonusAmount : 0;
  const netCustomerPayable = Math.max(0, targetAmount - effectiveBonus);

  // Total customer payable months (excluding bonus month if applicable)
  const lastCustomerPayableMonth = hasBonusMonth ? durationMonths - 1 : durationMonths;
  const remainingPayableMonths = Math.max(1, lastCustomerPayableMonth - joinedAtMonth + 1);

  // Discrete whole integer rupees
  const customMonthlyEmi = Math.round(netCustomerPayable / remainingPayableMonths);

  return {
    customMonthlyEmi,
    netCustomerPayable,
    remainingPayableMonths,
    joinedAtMonth,
    bonusAmount: effectiveBonus
  };
};
