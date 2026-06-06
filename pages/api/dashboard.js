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

  // Daily sales aggregation
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

  // Format daily data
  const dailyData = dailySales.map(d => ({
    date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
    revenue: d.revenue,
    profit: d.profit
  }));

  // Total aggregates (for stats cards)
  const salesAgg = await Sale.aggregate([
    { $group: { _id: null, totalRevenue: { $sum: '$revenue' }, totalProfit: { $sum: '$profit' } } }
  ]);
  const totalRevenue = salesAgg[0]?.totalRevenue || 0;
  const totalProfit = salesAgg[0]?.totalProfit || 0;

  const soldAgg = await Sale.aggregate([
    { $group: { _id: null, totalSold: { $sum: '$quantity' } } }
  ]);
  const totalSold = soldAgg[0]?.totalSold || 0;

 const stockAgg = await Product.aggregate([
  { $unwind: '$variants' },
  { $group: { _id: null, totalStock: { $sum: '$variants.quantity' } } }
]);
const remainingStock = stockAgg[0]?.totalStock || 0;
  res.status(200).json({
    totalRevenue,
    totalProfit,
    totalSold,
    remainingStock,
    dailyData,
    days
  });
}