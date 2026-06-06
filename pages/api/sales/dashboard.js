import { dbConnect } from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';
import Sale from '../../../lib/models/Sale';
import { verifyToken, getTokenFromReq } from '../../../lib/auth';

export default async function handler(req, res) {
  await dbConnect();
  const token = getTokenFromReq(req);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });
  const salesAgg = await Sale.aggregate([{ $group: { _id: null, totalRevenue: { $sum: '$revenue' }, totalProfit: { $sum: '$profit' } } }]);
  const totalRevenue = salesAgg[0]?.totalRevenue || 0;
  const totalProfit = salesAgg[0]?.totalProfit || 0;
  const soldAgg = await Sale.aggregate([{ $group: { _id: null, totalSold: { $sum: '$quantity' } } }]);
  const totalSold = soldAgg[0]?.totalSold || 0;
  const stockAgg = await Product.aggregate([{ $group: { _id: null, totalStock: { $sum: '$quantity' } } }]);
  const remainingStock = stockAgg[0]?.totalStock || 0;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const monthlySales = await Sale.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, total: { $sum: '$revenue' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = monthlySales.map(m => ({ month: monthNames[m._id.month - 1], sales: m.total }));
  res.status(200).json({ totalRevenue, totalProfit, totalSold, remainingStock, monthlyData });
}