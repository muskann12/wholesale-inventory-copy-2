import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  revenue: { type: Number, required: true },
  profit: { type: Number, required: true },
  size: { type: String, default: null }, // optional – null for raw cloth
  source: { type: String, enum: ['physical', 'shopify'], default: 'physical' },
  shopifyOrderId: { type: String },
  customerName: { type: String },
  isRawCloth: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);