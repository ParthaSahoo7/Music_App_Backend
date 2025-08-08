import { validationResult } from 'express-validator';
import paymentService from './paymentServices.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';
import { createRequestLogger } from '../../utils/requestLogger.js';

const initiateSubscriptionPayment = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Adding new subscription payment', { userId: req.user.userId, subscriptionData: req.body });

    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            log.warn('Validation failed during subscription payment addition', { errors: errors.array() });
            return res.status(400).json(errorResponse({
                message: 'Invalid input for adding subscription payment',
                errors: errors.array()
            }, 400));
        }

        const { subscriptionId } = req.body;
        const result = await paymentService.initiateSubscriptionPayment(req.user.userId, { subscriptionId }, log);

        log.info('Subscription payment added successfully', { paymentId: result.paymentId, subscriptionId: result.subscriptionId });
        return res.status(201).json(successResponse(result, 'Subscription payment added successfully.', 201));
    } catch (error) {
        log.error(`Error adding subscription payment: ${error.message}`);
        return res.status(error.status || 500).json(errorResponse({
            message: error.message || 'Failed to add subscription payment. Please try again.'
        }, error.status || 500));
    }
};

const initiateMerchandisePayment = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Adding new merchandise payment', { userId: req.user.userId, orderData: req.body });

    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            log.warn('Validation failed during merchandise payment addition', { errors: errors.array() });
            return res.status(400).json(errorResponse({
                message: 'Invalid input for adding merchandise payment',
                errors: errors.array()
            }, 400));
        }

        const { orderId, paymentMethodType } = req.body;
        const result = await paymentService.initiateMerchandisePayment(req.user.userId, { orderId, paymentMethodType }, log);

        log.info('Merchandise payment added successfully', { paymentId: result.paymentId, orderId: result.orderId });
        return res.status(201).json(successResponse(result, 'Merchandise payment added successfully.', 201));
    } catch (error) {
        log.error(`Error adding merchandise payment: ${error.message}`);
        return res.status(error.status || 500).json(errorResponse({
            message: error.message || 'Failed to add merchandise payment. Please try again.'
        }, error.status || 500));
    }
};

const handleWebhook = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Handling webhook', { eventType: req.body.type });

    try {
        const signature = req.headers['stripe-signature'];
        const result = await paymentService.handleWebhook(req.body, signature, log);

        log.info('Webhook handled successfully', { eventType: req.body.type });
        return res.status(200).json(successResponse(result, 'Webhook handled successfully.', 200));
    } catch (error) {
        log.error(`Error handling webhook: ${error.message}`);
        return res.status(error.status || 400).json(errorResponse({
            message: error.message || 'Failed to handle webhook. Please try again.'
        }, error.status || 400));
    }
};

const getTransaction = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Fetching transaction', { userId: req.user.userId, paymentId: req.params.paymentId });

    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            log.warn('Validation failed during transaction fetch', { errors: errors.array() });
            return res.status(400).json(errorResponse({
                message: 'Invalid input for fetching transaction',
                errors: errors.array()
            }, 400));
        }

        const { paymentId } = req.params;
        const transaction = await paymentService.getTransaction(req.user.userId, paymentId, log);

        log.info('Transaction fetched successfully', { paymentId });
        return res.status(200).json(successResponse(transaction, 'Transaction fetched successfully.', 200));
    } catch (error) {
        log.error(`Error fetching transaction: ${error.message}`);
        return res.status(error.status || 500).json(errorResponse({
            message: error.message || 'Failed to fetch transaction. Please try again.'
        }, error.status || 500));
    }
};

const initiateRefund = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Initiating refund', { userId: req.user.userId, paymentId: req.params.paymentId });

    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            log.warn('Validation failed during refund initiation', { errors: errors.array() });
            return res.status(400).json(errorResponse({
                message: 'Invalid input for initiating refund',
                errors: errors.array()
            }, 400));
        }

        const { paymentId } = req.params;
        const result = await paymentService.initiateRefund(req.user.userId, paymentId, log);

        log.info('Refund initiated successfully', { paymentId, refundId: result.refundId });
        return res.status(200).json(successResponse(result, 'Refund initiated successfully.', 200));
    } catch (error) {
        log.error(`Error initiating refund: ${error.message}`);
        return res.status(error.status || 500).json(errorResponse({
            message: error.message || 'Failed to initiate refund. Please try again.'
        }, error.status || 500));
    }
};

export default {
    initiateSubscriptionPayment,
    initiateMerchandisePayment,
    handleWebhook,
    getTransaction,
    initiateRefund
};