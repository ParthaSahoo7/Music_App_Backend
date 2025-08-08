import Stripe from 'stripe';
import Payment from './../../models/Payment.js';
import Order from './../../models/Order.js';
import Subscription from './../../models/Subscription.js';
import UserSubscription from './../../models/UserSubscription.js';
import UserAuth from './../../models/UserAuth.js';
import Product from './../../models/Products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const getOrCreateStripeCustomer = async (userId, log) => {
    try {
        const user = await UserAuth.findById(userId);
        if (!user) {
            log.warn('User not found', { userId });
            throw new Error('User not found.');
        }
        
        let customer = await stripe.customers.list({ email: user.email, limit: 1 });
        if (!customer.data.length) {
            customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
            });
        } else {
            customer = customer.data[0];
        }
        log.info('Stripe customer retrieved or created', { customerId: customer.id });
        return customer.id;
    } catch (error) {
        log.error(`Error getting or creating Stripe customer: ${error.message}`);
        throw new Error('Failed to get or create Stripe customer. Please try again.');
    }
};

const createPayment = async ({ userId, orderId, paymentMethodType }, log) => {
    try {
        const order = await Order.findById(orderId).populate('user');
        if (!order) {
            log.warn('Order not found', { orderId });
            throw new Error('Order not found.');
        }
        if (order.user._id.toString() !== userId.toString()) {
            log.warn('Order does not belong to user', { orderId, userId });
            throw new Error('Order does not belong to user.');
        }
        if (order.totalAmount <= 0) {
            log.warn('Invalid order amount', { orderId, totalAmount: order.totalAmount });
            throw new Error('Order total amount must be greater than 0.');
        }

        const stripeCustomerId = await getOrCreateStripeCustomer(userId, log);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(order.totalAmount * 100),
            currency: order.currency || 'usd',
            customer: stripeCustomerId,
            payment_method_types: [paymentMethodType],
            metadata: { orderId: orderId.toString(), userId: userId.toString() },
            description: `Payment for Order ${order.orderNumber || order._id}`,
        });

        const payment = new Payment({
            userId,
            orderId,
            amount: order.totalAmount,
            currency: order.currency || 'usd',
            paymentMethod: paymentMethodType,
            status: paymentIntent.status,
            stripePaymentIntentId: paymentIntent.id,
            stripeCustomerId,
            paymentDate: new Date(),
        });

        await payment.save();
        log.info('Payment saved successfully', { paymentId: payment._id });
        return { payment, clientSecret: paymentIntent.client_secret };
    } catch (error) {
        log.error(`Error creating payment: ${error.message}`);
        throw new Error(error.message || 'Failed to create payment. Please try again.');
    }
};

// const initiateSubscriptionPayment = async (userId, subscriptionData, log) => {
//     log.info('Adding new subscription payment', { userId, subscriptionData });

//     try {
//         // Fetch user details
//         const user = await UserAuth.findById(userId);
//         if (!user) {
//             log.warn('User not found', { userId });
//             throw new Error('User not found.');
//         }
//         console.log("Subscription Dataaaaaaaaaaaaaaaaaaaa", subscriptionData);
//         console.log("Subscription ID:", subscriptionData.subscriptionId);

        
//         // Validate subscription plan
//         const subscriptionPlan = await Subscription.findOne({ _id: subscriptionData.subscriptionId, isActive: true });

//         console.log("Subscription Plan", subscriptionPlan);
//         if (!subscriptionPlan) {
//             log.warn('Invalid or inactive subscription plan', { subscriptionId: subscriptionData.subscriptionId });
//             throw new Error('Invalid or inactive subscription plan.');
//         }

//         // Check for existing active subscription
//         const existingSubscription = await UserSubscription.findOne({ userId, status: 'active' });
//         if (existingSubscription) {
//             log.warn('User already has an active subscription', { userId, subscriptionId: existingSubscription._id });
//             throw new Error('User already has an active subscription.');
//         }

//         let payment;
//         let userSubscription;
//         let stripeSubscription;

//         if (subscriptionPlan.name === 'Free') {
//             // Handle free plan without Stripe payment
//             userSubscription = new UserSubscription({
//                 userId,
//                 subscriptionId: subscriptionPlan._id,
//                 startDate: new Date(),
//                 endDate: null,
//                 status: 'active',
//                 paymentStatus: 'none',
//                 autoRenew: false
//             });
//             await userSubscription.save();

//             payment = new Payment({
//                 userId,
//                 stripePaymentIntentId: 'free_plan_' + userSubscription._id,
//                 type: 'subscription',
//                 subscriptionId: userSubscription._id,
//                 amount: 0,
//                 currency: subscriptionPlan.currency,
//                 paymentMethod: 'none',
//                 status: 'succeeded'
//             });
//             await payment.save();
//         } else {
//             // Validate stripePriceId for recurring payment
//             if (!subscriptionPlan.stripePriceId) {
//                 log.warn('Stripe Price ID missing for recurring plan', { subscriptionId: subscriptionData.subscriptionId });
//                 throw new Error('Stripe Price ID is required for recurring plans.');
//             }

//             // Create Stripe customer
//             const stripeCustomerId = await getOrCreateStripeCustomer(userId, log);

//             // Create Stripe subscription
//              stripeSubscription = await stripe.subscriptions.create({
//                 customer: stripeCustomerId,
//                 items: [{ price: subscriptionPlan.stripePriceId }],
//                 payment_behavior: 'default_incomplete',
//                 expand: ['latest_invoice.payment_intent']
//             });

//             // Calculate end date
//             const startDate = new Date();
//             const endDate = new Date(startDate.getTime() + subscriptionPlan.durationMonths * 30 * 24 * 60 * 60 * 1000);

//             // Save user subscription
//             userSubscription = new UserSubscription({
//                 userId,
//                 subscriptionId: subscriptionPlan._id,
//                 startDate,
//                 endDate,
//                 status: 'active',
//                 paymentStatus: 'pending',
//                 autoRenew: true
//             });
//             await userSubscription.save();

//             // Save payment
//             payment = new Payment({
//                 userId,
//                 stripePaymentIntentId: stripeSubscription.latest_invoice.payment_intent.id,
//                 stripeSubscriptionId: stripeSubscription.id,
//                 type: 'subscription',
//                 subscriptionId: userSubscription._id,
//                 amount: stripeSubscription.latest_invoice.payment_intent.amount / 100,
//                 currency: stripeSubscription.latest_invoice.payment_intent.currency,
//                 paymentMethod: stripeSubscription.latest_invoice.payment_intent.payment_method_types[0],
//                 status: 'pending'
//             });
//             await payment.save();
//         }

//         log.info('Subscription payment added successfully', { subscriptionId: userSubscription._id, paymentId: payment._id });
//         return {
//             clientSecret: payment.status === 'succeeded' ? null : stripeSubscription?.latest_invoice.payment_intent.client_secret,
//             paymentId: payment._id,
//             subscriptionId: userSubscription._id
//         };
//     } catch (error) {
//         log.error(`Error adding subscription payment: ${error.message}`);
//         throw new Error(error.message || 'Failed to add subscription payment. Please try again.');
//     }
// };


const initiateSubscriptionPayment = async (userId, subscriptionData, log) => {
    log.info('Initiating new subscription payment', { userId, subscriptionData });

    try {
        // Fetch user details
        const user = await UserAuth.findById(userId);
        if (!user) {
            log.warn('User not found', { userId });
            throw new Error('User not found.');
        }

        // Validate subscription plan
        const subscriptionPlan = await Subscription.findOne({ _id: subscriptionData.subscriptionId, isActive: true });
        if (!subscriptionPlan) {
            log.warn('Invalid or inactive subscription plan', { subscriptionId: subscriptionData.subscriptionId });
            throw new Error('Invalid or inactive subscription plan.');
        }

        // Check for existing active or pending subscription
        const existingSubscription = await UserSubscription.findOne({
            userId,
            status: { $in: ['active', 'pending'] },
            paymentStatus: { $in: ['succeeded', 'pending'] }
        });

        if (existingSubscription) {
            const existingPlan = await Subscription.findById(existingSubscription.subscriptionId);
            if (!existingPlan) {
                log.warn('Existing subscription plan not found', { subscriptionId: existingSubscription.subscriptionId });
                throw new Error('Existing subscription plan not found.');
            }

            // Assume planLevel indicates hierarchy (e.g., free: 0, basic: 1, premium: 2)
            // Adjust this logic based on your Subscription schema
            if (existingPlan.planLevel >= subscriptionPlan.planLevel && existingSubscription.status === 'active') {
                log.warn('Cannot downgrade or select same plan', {
                    userId,
                    currentPlan: existingPlan.name,
                    newPlan: subscriptionPlan.name
                });
                throw new Error('Cannot downgrade or select the same subscription plan.');
            }

            if (existingSubscription.status === 'pending' && existingSubscription.paymentStatus === 'pending') {
                // Cancel pending subscription
                if (existingSubscription.stripeSubscriptionId) {
                    try {
                        await stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);
                        log.info('Canceled pending Stripe subscription', {
                            stripeSubscriptionId: existingSubscription.stripeSubscriptionId
                        });
                    } catch (stripeError) {
                        log.warn('Failed to cancel pending Stripe subscription, proceeding with new attempt', {
                            stripeSubscriptionId: existingSubscription.stripeSubscriptionId,
                            error: stripeError.message
                        });
                    }
                }
                existingSubscription.status = 'cancelled';
                existingSubscription.paymentStatus = 'failed';
                await existingSubscription.save();
                log.info('Marked pending subscription as canceled', {
                    subscriptionId: existingSubscription._id
                });
            } else if (existingSubscription.status === 'active' && existingSubscription.paymentStatus === 'succeeded') {
                if (existingPlan.name === 'Free') {
                    // Cancel free plan subscription
                    existingSubscription.status = 'cancelled';
                    existingSubscription.paymentStatus = 'none';
                    await existingSubscription.save();
                    log.info('Canceled free plan subscription for upgrade', {
                        subscriptionId: existingSubscription._id
                    });
                } else {
                    // Update existing Stripe subscription for paid plan upgrade
                    if (existingSubscription.stripeSubscriptionId) {
                        try {
                            const stripeSubscription = await stripe.subscriptions.update(
                                existingSubscription.stripeSubscriptionId,
                                {
                                    items: [{ id: existingSubscription.stripeSubscriptionId, price: subscriptionPlan.stripePriceId }],
                                    proration_behavior: 'create_prorations',
                                    payment_behavior: 'default_incomplete',
                                    expand: ['latest_invoice.payment_intent']
                                }
                            );

                            // Update UserSubscription with new plan details
                            existingSubscription.subscriptionId = subscriptionPlan._id;
                            existingSubscription.status = 'pending';
                            existingSubscription.paymentStatus = 'pending';
                            existingSubscription.startDate = new Date();
                            existingSubscription.endDate = new Date(
                                existingSubscription.startDate.getTime() + subscriptionPlan.durationMonths * 30 * 24 * 60 * 60 * 1000
                            );
                            await existingSubscription.save();

                            // Update Payment
                            let payment = await Payment.findOne({
                                stripeSubscriptionId: stripeSubscription.id,
                                status: 'pending'
                            });
                            if (!payment) {
                                payment = new Payment({
                                    userId,
                                    stripePaymentIntentId: stripeSubscription.latest_invoice.payment_intent.id,
                                    stripeSubscriptionId: stripeSubscription.id,
                                    type: 'subscription',
                                    subscriptionId: existingSubscription._id,
                                    amount: stripeSubscription.latest_invoice.payment_intent.amount / 100,
                                    currency: stripeSubscription.latest_invoice.payment_intent.currency,
                                    paymentMethod: stripeSubscription.latest_invoice.payment_intent.payment_method_types[0],
                                    status: 'pending'
                                });
                            } else {
                                payment.stripePaymentIntentId = stripeSubscription.latest_invoice.payment_intent.id;
                                payment.amount = stripeSubscription.latest_invoice.payment_intent.amount / 100;
                                payment.currency = stripeSubscription.latest_invoice.payment_intent.currency;
                                payment.paymentMethod = stripeSubscription.latest_invoice.payment_intent.payment_method_types[0];
                            }
                            await payment.save();

                            log.info('Updated existing Stripe subscription for upgrade', {
                                subscriptionId: existingSubscription._id,
                                paymentId: payment._id
                            });
                            return {
                                clientSecret: stripeSubscription.latest_invoice.payment_intent.client_secret,
                                paymentId: payment._id,
                                subscriptionId: existingSubscription._id
                            };
                        } catch (stripeError) {
                            log.error('Failed to update Stripe subscription for upgrade', { error: stripeError.message });
                            throw new Error('Failed to upgrade subscription. Please try again.');
                        }
                    }
                }
            }
        }

        let payment;
        let userSubscription;
        let stripeSubscription;

        if (subscriptionPlan.name === 'Free') {
            // Handle free plan without Stripe payment
            userSubscription = new UserSubscription({
                userId,
                subscriptionId: subscriptionPlan._id,
                startDate: new Date(),
                endDate: null,
                status: 'active',
                paymentStatus: 'none',
                autoRenew: false
            });
            await userSubscription.save();

            payment = new Payment({
                userId,
                stripePaymentIntentId: 'free_plan_' + userSubscription._id,
                type: 'subscription',
                subscriptionId: userSubscription._id,
                amount: 0,
                currency: subscriptionPlan.currency,
                paymentMethod: 'none',
                status: 'succeeded'
            });
            await payment.save();
        } else {
            // Validate stripePriceId for recurring payment
            if (!subscriptionPlan.stripePriceId) {
                log.warn('Stripe Price ID missing for recurring plan', { subscriptionId: subscriptionData.subscriptionId });
                throw new Error('Stripe Price ID is required for recurring plans.');
            }

            // Create Stripe customer
            const stripeCustomerId = await getOrCreateStripeCustomer(userId, log);

            // Create new Stripe subscription
            stripeSubscription = await stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: subscriptionPlan.stripePriceId }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent']
            });

            // Calculate end date
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + subscriptionPlan.durationMonths * 30 * 24 * 60 * 60 * 1000);

            // Save user subscription with pending status
            userSubscription = new UserSubscription({
                userId,
                subscriptionId: subscriptionPlan._id,
                startDate,
                endDate,
                status: 'pending',
                paymentStatus: 'pending',
                autoRenew: true,
                stripeSubscriptionId: stripeSubscription.id
            });
            await userSubscription.save();

            // Save payment
            payment = new Payment({
                userId,
                stripePaymentIntentId: stripeSubscription.latest_invoice.payment_intent.id,
                stripeSubscriptionId: stripeSubscription.id,
                type: 'subscription',
                subscriptionId: userSubscription._id,
                amount: stripeSubscription.latest_invoice.payment_intent.amount / 100,
                currency: stripeSubscription.latest_invoice.payment_intent.currency,
                paymentMethod: stripeSubscription.latest_invoice.payment_intent.payment_method_types[0],
                status: 'pending'
            });
            await payment.save();
        }

        log.info('Subscription payment initiated successfully', { subscriptionId: userSubscription._id, paymentId: payment._id });
        return {
            clientSecret: payment.status === 'succeeded' ? null : stripeSubscription?.latest_invoice.payment_intent.client_secret,
            paymentId: payment._id,
            subscriptionId: userSubscription._id
        };
    } catch (error) {
        log.error(`Error initiating subscription payment: ${error.message}`);
        throw new Error(error.message || 'Failed to initiate subscription payment. Please try again.');
    }
};

const initiateMerchandisePayment = async (userId, orderData, log) => {
    log.info('Adding new merchandise payment', { userId, orderData });

    try {
        const { payment, clientSecret } = await createPayment({
            userId,
            orderId: orderData.orderId,
            paymentMethodType: orderData.paymentMethodType
        }, log);

        await Order.findByIdAndUpdate(orderData.orderId, { status: 'pending' });

        log.info('Merchandise payment added successfully', { orderId: orderData.orderId, paymentId: payment._id });
        return {
            clientSecret,
            paymentId: payment._id,
            orderId: orderData.orderId
        };
    } catch (error) {
        log.error(`Error adding merchandise payment: ${error.message}`);
        throw new Error(error.message || 'Failed to add merchandise payment. Please try again.');
    }
};

const handleWebhook = async (payload, signature, log) => {
    log.info('Handling Stripe webhook', { event: payload.type });

    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const payment = await Payment.findOneAndUpdate(
                { stripePaymentIntentId: paymentIntent.id },
                { status: 'succeeded' },
                { new: true }
            );
            if (!payment) {
                log.warn('Payment not found for PaymentIntent', { paymentIntentId: paymentIntent.id });
                throw new Error('Payment not found.');
            }
            if (payment.type === 'merchandise') {
                await Order.findByIdAndUpdate(payment.orderId, { status: 'completed' });
            } else if (payment.type === 'subscription') {
                await UserSubscription.findByIdAndUpdate(payment.subscriptionId, { paymentStatus: 'completed' });
            }
            log.info('Payment succeeded', { paymentId: payment._id });
        } else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            const payment = await Payment.findOneAndUpdate(
                { stripePaymentIntentId: paymentIntent.id },
                { status: 'failed' },
                { new: true }
            );
            if (!payment) {
                log.warn('Payment not found for PaymentIntent', { paymentIntentId: paymentIntent.id });
                throw new Error('Payment not found.');
            }
            if (payment.type === 'subscription') {
                await UserSubscription.findByIdAndUpdate(payment.subscriptionId, { paymentStatus: 'failed', status: 'cancelled' });
            } else if (payment.type === 'merchandise') {
                await Order.findByIdAndUpdate(payment.orderId, { status: 'cancelled' });
                const order = await Order.findById(payment.orderId);
                for (const item of order.items) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity }
                    });
                }
            }
            log.info('Payment failed', { paymentIntentId: paymentIntent.id });
        } else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            const payment = await Payment.findOneAndUpdate(
                { stripeSubscriptionId: invoice.subscription },
                { status: 'succeeded' },
                { new: true }
            );
            if (!payment) {
                log.warn('Payment not found for subscription invoice', { subscriptionId: invoice.subscription });
                throw new Error('Payment not found.');
            }
            await UserSubscription.findByIdAndUpdate(payment.subscriptionId, { paymentStatus: 'completed' });
            log.info('Subscription invoice payment succeeded', { paymentId: payment._id });
        } else if (event.type === 'charge.refunded') {
            const charge = event.data.object;
            const payment = await Payment.findOneAndUpdate(
                { stripePaymentIntentId: charge.payment_intent },
                { 
                    refundStatus: 'succeeded',
                    stripeRefundId: charge.id
                },
                { new: true }
            );
            if (!payment) {
                log.warn('Payment not found for refund', { paymentIntentId: charge.payment_intent });
                throw new Error('Payment not found.');
            }
            if (payment.type === 'merchandise') {
                await Order.findByIdAndUpdate(payment.orderId, { status: 'cancelled' });
                const order = await Order.findById(payment.orderId);
                for (const item of order.items) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity }
                    });
                }
            } else if (payment.type === 'subscription') {
                await UserSubscription.findByIdAndUpdate(payment.subscriptionId, { 
                    status: 'cancelled',
                    paymentStatus: 'none'
                });
            }
            log.info('Refund processed', { paymentId: payment._id, refundId: charge.id });
        }

        log.info('Webhook handled successfully', { eventType: event.type });
        return { status: 'success' };
    } catch (error) {
        log.error(`Error handling webhook: ${error.message}`);
        throw new Error(error.message || 'Failed to handle webhook. Please try again.');
    }
};

const getTransaction = async (userId, paymentId, log) => {
    log.info('Fetching transaction', { userId, paymentId });

    try {
        const payment = await Payment.findOne({ _id: paymentId, userId })
            .populate({
                path: 'subscriptionId',
                populate: { path: 'subscriptionId', model: 'Subscription' }
            })
            .populate('orderId');
        if (!payment) {
            log.warn('Transaction not found', { userId, paymentId });
            throw new Error('Transaction not found.');
        }
        log.info('Transaction fetched successfully', { paymentId });
        return payment;
    } catch (error) {
        log.error(`Error fetching transaction: ${error.message}`);
        throw new Error(error.message || 'Failed to fetch transaction. Please try again.');
    }
};

const initiateRefund = async (userId, paymentId, log) => {
    log.info('Initiating refund', { userId, paymentId });

    try {
        const payment = await Payment.findOne({ _id: paymentId, userId });
        if (!payment) {
            log.warn('Payment not found', { userId, paymentId });
            throw new Error('Payment not found.');
        }
        if (payment.status !== 'succeeded') {
            log.warn('Payment not eligible for refund', { paymentId, status: payment.status });
            throw new Error('Payment is not eligible for refund.');
        }
        if (payment.refundStatus !== 'none') {
            log.warn('Refund already processed or requested', { paymentId, refundStatus: payment.refundStatus });
            throw new Error('Refund already processed or requested.');
        }

        const refund = await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId
        });

        await Payment.findByIdAndUpdate(paymentId, {
            refundStatus: 'succeeded',
            stripeRefundId: refund.id
        });

        if (payment.type === 'merchandise') {
            await Order.findByIdAndUpdate(payment.orderId, { status: 'cancelled' });
            const order = await Order.findById(payment.orderId);
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity }
                });
            }
        } else if (payment.type === 'subscription') {
            await UserSubscription.findByIdAndUpdate(payment.subscriptionId, {
                status: 'cancelled',
                paymentStatus: 'none'
            });
            if (payment.stripeSubscriptionId) {
                await stripe.subscriptions.cancel(payment.stripeSubscriptionId);
            }
        }

        log.info('Refund initiated successfully', { paymentId, refundId: refund.id });
        return { paymentId, refundId: refund.id };
    } catch (error) {
        log.error(`Error initiating refund: ${error.message}`);
        throw new Error(error.message || 'Failed to initiate refund. Please try again.');
    }
};

export default {
    initiateSubscriptionPayment,
    initiateMerchandisePayment,
    handleWebhook,
    getTransaction,
    initiateRefund,
    createPayment
};