import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const UserSubscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'UserAuth',
    required: true
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: function() {
      return this.subscriptionId.name !== 'Free'; // Only required for non-Free plans
    }
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'none'],
    default: 'none' // 'none' for Free plan
  },
  autoRenew: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure unique user-subscription pair (only one active subscription per user)
UserSubscriptionSchema.index({ userId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const UserSubscription = mongoose.model('UserSubscription', UserSubscriptionSchema);
export default UserSubscription;