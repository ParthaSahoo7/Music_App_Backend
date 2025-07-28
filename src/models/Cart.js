import mongoose from "mongoose";
const { Schema } = mongoose;

const CartSchema = new Schema({
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
}, { timestamps: true });


// Export the Cart model
const Cart = mongoose.model('Cart', CartSchema);
export default Cart; // ✅ Use ESM export