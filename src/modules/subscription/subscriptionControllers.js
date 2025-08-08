import { validationResult } from 'express-validator';
import subscriptionServices from './subscriptionServices.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';
import { createRequestLogger } from '../../utils/requestLogger.js';

const getAllSubscriptions = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Fetching all subscriptions for user', { userId: req.user.userId });

    try {
        const subscriptions = await subscriptionServices.getAllSubscriptions(log);
        log.info('Fetched all subscriptions successfully', { count: subscriptions.length });
        return res.status(200).json(successResponse(subscriptions, 'Subscriptions fetched successfully.', 200));
    } catch (error) {
        log.error(`Error fetching subscriptions: ${error.message}`);
        return res.status(error.status || 500).json(errorResponse({
            message: error.message || 'Failed to fetch subscriptions. Please try again.'
        }, error.status || 500));
    }
}

const getSubscriptionById = async (req, res) => {
    const log = createRequestLogger(req);
    log.info('Fetching subscription by ID', { userId: req.user.userId, subscriptionId: req.params.subscriptionId });

    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            log.warn('Validation failed during subscription fetch', { errors: errors.array() });
            return res.status(400).json(errorResponse({
                message: 'Invalid input for fetching subscription',
                errors: errors.array()
            }, 400));
        }

        const { subscriptionId } = req.params;
        const subscription = await subscriptionServices.getSubscriptionById(subscriptionId, log);

        if (!subscription) {
            log.warn('Subscription not found', { subscriptionId });
            return res.status(404).json(errorResponse({
                message: 'Subscription not found.'
            }, 404));
        }

        log.info('Subscription fetched successfully', { subscriptionId });
        return res.status(200).json(successResponse(subscription, 'Subscription fetched successfully.', 200));
    } catch (error) {
        log.error(`Error fetching subscription: ${error.message}`);
        return res.status(error.status || 500).json(errorResponse({
            message: error.message || 'Failed to fetch subscription. Please try again.'
        }, error.status || 500));
    }
}

export default {
    getAllSubscriptions,
    getSubscriptionById
};