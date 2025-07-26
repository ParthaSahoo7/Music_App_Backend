import mongoose from "mongoose";
const { Schema } = mongoose;

const TransactionSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'bank_transfer'],
    required: true,
  },
}, { timestamps: true });

// Index for efficient querying by user and status
TransactionSchema.index({ user: 1, status: 1 });

// Export the Transaction model
const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction; // ✅ Use ESM export