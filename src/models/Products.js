import mongoose from "mongoose";
const { Schema } = mongoose;

const ProductSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  stock: { type: Number, required: true, min: 0 },
  images: [{ type: String }],
}, { timestamps: true });

// Index for efficient querying by category
ProductSchema.index({ category: 1 });

// Export the Product model
const Product = mongoose.model('Product', ProductSchema);
export default Product; // ✅ Use ESM export