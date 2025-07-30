import mongoose from 'mongoose';
const { Schema } = mongoose;

const SubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuth',
        required: true,
        index: true
    },
    plan: {
        type: String,
        enum: ['free', 'premium', 'premium+'],
        required: true,
        default: 'free'
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'canceled'],
        default: 'active'
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date
    }
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

export default Subscription;