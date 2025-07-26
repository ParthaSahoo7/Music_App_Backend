import mongoose from "mongoose";
const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    required: true,
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active',
  },
}, { timestamps: true });
// Index for efficient querying by user and status
SubscriptionSchema.index({ user: 1, status: 1 });

// Export the Subscription model
const Subscription = mongoose.model('Subscription', SubscriptionSchema);