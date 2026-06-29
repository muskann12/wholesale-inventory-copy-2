import { dbConnect } from '../../lib/mongodb';
import Product from '../../lib/models/Product';
import Sale from '../../lib/models/Sale';
import { verifyToken, getTokenFromReq } from '../../lib/auth';

export default async function handler(req, res) {
  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });

  // Get days parameter (default 30)
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // --- Daily Sales Aggregation (all sales) ---
  const dailySales = await Sale.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        revenue: { $sum: '$revenue' },
        profit: { $sum: '$profit' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  const dailyData = dailySales.map(d => ({
    date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
    revenue: d.revenue,
    profit: d.profit
  }));

  // --- Overall Sales Aggregates ---
  const salesAgg = await Sale.aggregate([
    { $group: { _id: null, totalRevenue: { $sum: '$revenue' }, totalProfit: { $sum: '$profit' } } }
  ]);
  const totalRevenue = salesAgg[0]?.totalRevenue || 0;
  const totalProfit = salesAgg[0]?.totalProfit || 0;

  const soldAgg = await Sale.aggregate([
    { $group: { _id: null, totalSold: { $sum: '$quantity' } } }
  ]);
  const totalSold = soldAgg[0]?.totalSold || 0;

  // --- Regular Product Stock (variants) ---
  const regularStockAgg = await Product.aggregate([
    { $match: { isRawCloth: { $ne: true } } },
    { $unwind: '$variants' },
    { $group: { _id: null, totalStock: { $sum: '$variants.quantity' } } }
  ]);
  const regularStock = regularStockAgg[0]?.totalStock || 0;

  // --- Regular Product Stock Cost ---
  const stockCostAgg = await Product.aggregate([
    { $match: { isRawCloth: { $ne: true } } },
    { $unwind: '$variants' },
    {
      $group: {
        _id: null,
        stockCost: {
          $sum: { $multiply: ['$variants.quantity', '$variants.costPrice'] }
        }
      }
    }
  ]);
  const stockCost = stockCostAgg[0]?.stockCost || 0;

  // --- Raw Cloth Stock (single quantity field) ---
  const rawClothStockAgg = await Product.aggregate([
    { $match: { isRawCloth: true } },
    { $group: { _id: null, totalStock: { $sum: '$quantity' } } }
  ]);
  const rawClothStock = rawClothStockAgg[0]?.totalStock || 0;

  // --- Raw Cloth Stock Cost (optional, if needed) ---
  const rawClothStockCostAgg = await Product.aggregate([
    { $match: { isRawCloth: true } },
    {
      $group: {
        _id: null,
        stockCost: {
          $sum: { $multiply: ['$quantity', '$costPrice'] }
        }
      }
    }
  ]);
  const rawClothStockCost = rawClothStockCostAgg[0]?.stockCost || 0;

  // --- Total stock (regular + raw cloth) ---
  const totalStock = regularStock + rawClothStock;

  // --- Raw Cloth Sales Metrics ---
  const rawClothSalesAgg = await Sale.aggregate([
    { $match: { isRawCloth: true } },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$revenue' },
        profit: { $sum: '$profit' },
        qty: { $sum: '$quantity' }
      }
    }
  ]);
  const rawClothRevenue = rawClothSalesAgg[0]?.revenue || 0;
  const rawClothProfit = rawClothSalesAgg[0]?.profit || 0;
  const rawClothQuantitySold = rawClothSalesAgg[0]?.qty || 0;

  // --- Regular Product Sales (optional for reference) ---
  // Not needed separately, but we already have overall totals.

  res.status(200).json({
    totalRevenue,
    totalProfit,
    totalSold,
    totalStock,
    regularStock,
    rawClothStock,
    stockCost,
    rawClothStockCost,
    rawClothRevenue,
    rawClothProfit,
    rawClothQuantitySold,
    dailyData,
    days
  });
}