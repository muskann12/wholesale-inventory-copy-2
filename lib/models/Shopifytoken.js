import mongoose from 'mongoose';

const ShopifyTokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },   // token expiry time
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure only one token record exists (use singleton pattern)
ShopifyTokenSchema.statics.getLatestToken = async function() {
  return await this.findOne().sort({ createdAt: -1 });
};

export default mongoose.models.ShopifyToken || mongoose.model('ShopifyToken', ShopifyTokenSchema);