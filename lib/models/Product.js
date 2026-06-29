import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  size: { type: String, enum: ['Small', 'Medium', 'Large'], required: true },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  isRawCloth: { type: Boolean, default: false },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  description: { type: String, default: '' },          // NEW
  images: [{ type: String, default: [] }],              // NEW – array of URLs
  variants: {
    type: [VariantSchema],
    default: () => [
      { size: 'Small', costPrice: 0, sellingPrice: 0, quantity: 0 },
      { size: 'Medium', costPrice: 0, sellingPrice: 0, quantity: 0 },
      { size: 'Large', costPrice: 0, sellingPrice: 0, quantity: 0 }
    ]
  }
}, { timestamps: true });

ProductSchema.virtual('totalStock').get(function() {
  return this.variants.reduce((sum, v) => sum + v.quantity, 0);
});

ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);