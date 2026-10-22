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
      maxCapacity, 
      totalSlots = 50,
      benefits, 
      hasBonusMonth = true, 
      bonusAmount 
    } = req.body;

    if (!name || !targetAmount) {
      return res.fail('Name and target amount are required.', 400, 'VALIDATION_ERROR');
    }

    const calculatedInstallment = monthlyInstallment || Math.round(targetAmount / durationMonths);
    const calculatedBonus = bonusAmount !== undefined ? bonusAmount : calculatedInstallment;
    const finalSlots = totalSlots ? parseInt(totalSlots, 10) : 50;

    const scheme = await Scheme.create({
      name,
      targetAmount,
      durationMonths: parseInt(durationMonths, 10),
      monthlyInstallment: calculatedInstallment,
      maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : finalSlots,
      totalSlots: finalSlots,
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

export const getSchemeNumbersController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.fail('Scheme not found.', 404, 'SCHEME_NOT_FOUND');
    }

    const { Membership } = await import('../models/Membership.model.js');
    const existingMemberships = await Membership.find({ schemeId: scheme._id });
    const bookedMap = new Map();
    existingMemberships.forEach(m => {
      const num = m.kittyNumber || m.tokenNumber;
      bookedMap.set(num, m.chitToken || `#SW-${String(num).padStart(3, '0')}`);
    });

    const totalSlots = scheme.totalSlots || 50;
    const numbers = [];

    for (let i = 1; i <= totalSlots; i++) {
      const isBooked = bookedMap.has(i);
      numbers.push({
        number: i,
        label: String(i).padStart(2, '0'),
        status: isBooked ? 'BOOKED' : 'AVAILABLE',
        ...(isBooked ? { chitToken: bookedMap.get(i) } : {})
      });
    }

    return res.ok({
      schemeId: scheme._id.toString(),
      totalSlots,
      numbers
    }, 'Scheme number slots retrieved.');
  } catch (error) {
    next(error);
  }
};

