import express from 'express';
import { check } from 'express-validator';
import paymentController from './paymentControllers.js';
import authorizeUser from '../../middlewares/authorizeUser.js';

const router = express.Router();

router.post(
    '/subscription',
    [
        check('subscriptionId', 'Valid Subscription ID is required').isMongoId()
    ],
    authorizeUser,
    paymentController.initiateSubscriptionPayment
);

router.post(
    '/merchandise',
    [
        check('orderId', 'Valid Order ID is required').isMongoId(),
        check('paymentMethodType', 'Valid payment method type is required').isIn(['card', 'apple_pay', 'google_pay', 'paypal', 'sepa_debit', 'ideal', 'klarna', 'afterpay_clearpay'])
    ],
    authorizeUser,
    paymentController.initiateMerchandisePayment
);

router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handleWebhook
);

router.get(
    '/transaction/:paymentId',
    [check('paymentId', 'Valid payment ID is required').isMongoId()],
    authorizeUser,
    paymentController.getTransaction
);

router.post(
    '/refund/:paymentId',
    [check('paymentId', 'Valid payment ID is required').isMongoId()],
    authorizeUser,
    paymentController.initiateRefund
);

export default router;