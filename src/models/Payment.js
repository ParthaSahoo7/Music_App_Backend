import mongoose from 'mongoose';
const { Schema } = mongoose;

const PaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAuth',
        required: true,
        index: true
    },
    stripePaymentIntentId: {
        type: String,
        required: true,
        index: true
    },
    stripeSubscriptionId: {
        type: String,
        index: true
    },
    type: {
        type: String,
        enum: ['subscription', 'merchandise'],
        required: true
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserSubscription', // Changed to reference UserSubscription
        required: function () { return this.type === 'subscription'; }
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: function () { return this.type === 'merchandise'; }
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'usd'
    },
    status: {
        type: String,
        enum: ['pending', 'succeeded', 'failed', 'canceled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    refundStatus: {
        type: String,
        enum: ['none', 'requested', 'succeeded', 'failed'],
        default: 'none'
    },
    stripeRefundId: {
        type: String,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);

export default Payment;