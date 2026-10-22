import { GoldRate } from '../models/index.js';

export const getCoinsCatalogController = async (req, res, next) => {
  try {
    const latestRate = await GoldRate.findOne().sort({ updatedAt: -1 });
    const rate24k = latestRate ? latestRate.rate24k : 7485.50;
    const rate22k = latestRate ? latestRate.rate22k : 6860.00;
    const rateSilver = 92.50; // Standard 999 fine silver benchmark per gram

    const coinTemplates = [
      {
        id: 'COIN-GOLD-1G-999',
        name: '1g 24K Gold Coin',
        metal: 'GOLD',
        karat: '24K',
        purity: '999 Hallmark',
        purityFraction: 0.999,
        weightGrams: 1.0,
        makingCharges: 350,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_1g_gold.png'
      },
      {
        id: 'COIN-GOLD-2G-999',
        name: '2g 24K Gold Coin',
        metal: 'GOLD',
        karat: '24K',
        purity: '999 Hallmark',
        purityFraction: 0.999,
        weightGrams: 2.0,
        makingCharges: 500,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_2g_gold.png'
      },
      {
        id: 'COIN-GOLD-4G-999',
        name: '4g 24K Gold Coin',
        metal: 'GOLD',
        karat: '24K',
        purity: '999 Hallmark',
        purityFraction: 0.999,
        weightGrams: 4.0,
        makingCharges: 800,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_4g_gold.png'
      },
      {
        id: 'COIN-GOLD-5G-999',
        name: '5g 24K Gold Coin',
        metal: 'GOLD',
        karat: '24K',
        purity: '999 Hallmark',
        purityFraction: 0.999,
        weightGrams: 5.0,
        makingCharges: 950,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_5g_gold.png'
      },
      {
        id: 'COIN-GOLD-8G-999',
        name: '8g 24K Gold Coin (Guini)',
        metal: 'GOLD',
        karat: '24K',
        purity: '999 Hallmark',
        purityFraction: 0.999,
        weightGrams: 8.0,
        makingCharges: 1200,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_8g_gold.png'
      },
      {
        id: 'COIN-GOLD-10G-999',
        name: '10g 24K Gold Coin',
        metal: 'GOLD',
        karat: '24K',
        purity: '999 Hallmark',
        purityFraction: 0.999,
        weightGrams: 10.0,
        makingCharges: 1400,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_10g_gold.png'
      },
      {
        id: 'COIN-SILVER-10G-999',
        name: '10g 999 Silver Coin',
        metal: 'SILVER',
        karat: 'SILVER_999',
        purity: '999 Fine Silver',
        purityFraction: 0.999,
        weightGrams: 10.0,
        makingCharges: 150,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_10g_silver.png'
      },
      {
        id: 'COIN-SILVER-50G-999',
        name: '50g 999 Silver Coin',
        metal: 'SILVER',
        karat: 'SILVER_999',
        purity: '999 Fine Silver',
        purityFraction: 0.999,
        weightGrams: 50.0,
        makingCharges: 300,
        inStock: true,
        imageUrl: 'assets/images/coins/coin_50g_silver.png'
      }
    ];

    const coinsWithPricing = coinTemplates.map(coin => {
      const perGramRate = coin.metal === 'GOLD' ? rate24k : rateSilver;
      const basePrice = Math.round(coin.weightGrams * perGramRate);
      const totalAmount = basePrice + coin.makingCharges;

      return {
        ...coin,
        benchmarkRate: perGramRate,
        basePrice,
        unitPrice: totalAmount,
        totalAmount
      };
    });

    return res.ok({
      benchmarkRate24k: rate24k,
      benchmarkRate22k: rate22k,
      benchmarkSilver: rateSilver,
      totalCoins: coinsWithPricing.length,
      coins: coinsWithPricing
    }, 'Coins catalog retrieved.');
  } catch (error) {
    next(error);
  }
};
