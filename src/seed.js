import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import { Scheme, GoldRate, User } from './models/index.js';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await connectDB();

    console.log('[Seed] Seeding live benchmark Gold Rates...');
    await GoldRate.deleteMany({});
    const goldRate = await GoldRate.create({
      rate24k: 7850,
      rate22k: 7195,
      rateChangePct: 0.45,
      benchmark: 'IBJA Official Bullion Rate',
      unit: '1 gram',
      currency: 'INR',
      updatedAt: new Date()
    });
    console.log(`[Seed] Created Gold Rate: 24K ₹${goldRate.rate24k}/g | 22K ₹${goldRate.rate22k}/g`);

    console.log('[Seed] Seeding official Swastik 11+1 Gold Savings Schemes...');
    await Scheme.deleteMany({});
    const schemes = await Scheme.create([
      {
        name: 'Swastik Samriddhi 11+1 Plan',
        monthlyInstallment: 5000,
        targetAmount: 60000,
        durationMonths: 12,
        maxCapacity: 50,
        totalSlots: 50,
        currentMembers: 0,
        status: 'OPEN',
        hasBonusMonth: true,
        bonusAmount: 5000,
        benefits: [
          'Pay for 11 months, 12th month installment completely free by Swastik Jewellers',
          'Lock gold grams at live 24K benchmark rate on each monthly installment payment',
          'Zero making charges redemption voucher up to 18% on final jewelry selection',
          '100% BIS Hallmarked 22K & 24K gold ornaments and bullion coins'
        ]
      },
      {
        name: 'Swastik Dhanvarsha 11+1 Plan',
        monthlyInstallment: 10000,
        targetAmount: 120000,
        durationMonths: 12,
        maxCapacity: 50,
        totalSlots: 50,
        currentMembers: 0,
        status: 'OPEN',
        hasBonusMonth: true,
        bonusAmount: 10000,
        benefits: [
          'Premium ₹10,000/month installment plan with full 12th month bonus ₹10,000 credit',
          'Priority token allotment and early lucky draw eligibility each month',
          'Complimentary 1 gram 24K 999 Lakshmi gold coin on successful completion',
          'Full digital passbook with verifiable GST invoices & cryptographic receipts'
        ]
      },
      {
        name: 'Swastik Shubh Labh 11+1 Plan',
        monthlyInstallment: 2500,
        targetAmount: 30000,
        durationMonths: 12,
        maxCapacity: 50,
        totalSlots: 50,
        currentMembers: 0,
        status: 'OPEN',
        hasBonusMonth: true,
        bonusAmount: 2500,
        benefits: [
          'Accessible entry-level savings at just ₹2,500 monthly installment',
          '12th month bonus ₹2,500 contribution sponsored by Swastik Jewellers',
          'Redeem for certified 22K lightweight bridal, temple, or everyday jewelry',
          'Doorstep cash collection or instant UPI/card checkout supported'
        ]
      }
    ]);
    console.log(`[Seed] Seeded ${schemes.length} official schemes.`);

    console.log('[Seed] Ensuring master admin user exists...');
    const adminPhone = '+919999999999';
    let admin = await User.findOne({ phone: adminPhone });
    if (!admin) {
      admin = await User.create({
        name: 'Swastik Jewellers Admin',
        phone: adminPhone,
        email: 'admin@swastikjewel.com',
        role: 'ADMIN',
        kyc: {
          isVerified: true,
          status: 'VERIFIED'
        }
      });
      console.log('[Seed] Created master admin account:', admin.phone);
    } else {
      console.log('[Seed] Master admin already exists:', admin.phone);
    }

    console.log('✨ [Seed] All real production data seeded successfully into MongoDB Atlas!');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed Error]', error);
    process.exit(1);
  }
};

seedDatabase();
