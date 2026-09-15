import { Scheme } from '../models/index.js';

export const getActiveSchemesController = async (req, res, next) => {
  try {
    const { duration } = req.query;
    const filter = { status: 'OPEN' };

    if (duration) {
      filter.durationMonths = parseInt(duration, 10);
    }

    const schemes = await Scheme.find(filter).sort({ createdAt: -1 });

    const formattedSchemes = schemes.map(s => ({
      id: s._id.toString(),
      name: s.name,
      targetAmount: s.targetAmount,
      durationMonths: s.durationMonths,
      monthlyInstallment: s.monthlyInstallment,
      maxCapacity: s.maxCapacity,
      currentMembers: s.currentMembers,
      status: s.status,
      benefits: s.benefits || [],
      bannerImageUrl: s.bannerImageUrl || 'assets/banner_clean_bonus.jpg',
      isPopular: s.currentMembers > 20
    }));

    return res.ok({ schemes: formattedSchemes }, 'Active schemes retrieved.');
  } catch (error) {
    next(error);
  }
};

export const createSchemeController = async (req, res, next) => {
  try {
    const { 
      name, 
      targetAmount, 
      durationMonths = 12, 
      monthlyInstallment, 
      maxCapacity = 100, 
      benefits, 
      hasBonusMonth = true, 
      bonusAmount 
    } = req.body;

    if (!name || !targetAmount) {
      return res.fail('Name and target amount are required.', 400, 'VALIDATION_ERROR');
    }

    const calculatedInstallment = monthlyInstallment || Math.round(targetAmount / durationMonths);
    const calculatedBonus = bonusAmount !== undefined ? bonusAmount : calculatedInstallment;

    const scheme = await Scheme.create({
      name,
      targetAmount,
      durationMonths,
      monthlyInstallment: calculatedInstallment,
      maxCapacity,
      benefits: benefits || [
        '1 Month Free: 11 Paid + 12th Month 100% Jeweler Bonus',
        '25% Flat Discount on Jewellery Making Charges',
        'Accumulate 24K 999 Hallmark Purity Gold'
      ],
      hasBonusMonth,
      bonusAmount: calculatedBonus
    });

    return res.created({
      id: scheme._id.toString(),
      name: scheme.name,
      targetAmount: scheme.targetAmount,
      durationMonths: scheme.durationMonths,
      monthlyInstallment: scheme.monthlyInstallment,
      maxCapacity: scheme.maxCapacity,
      status: scheme.status
    }, 'Scheme created successfully.');
  } catch (error) {
    next(error);
  }
};
