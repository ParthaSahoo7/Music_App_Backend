import Subscription from "../../models/Subscription.js";

const getAllSubscriptions = async (log) => {
    log.info('Fetching all subscriptions from the database');
    try {
        const subscriptions = await Subscription.find().lean();
        log.info(`Fetched ${subscriptions.length} subscriptions successfully`);
        return subscriptions;
    } catch (error) {
        log.error(`Error fetching subscriptions: ${error.message}`);
        throw { status: 500, message: 'Failed to fetch subscriptions. Please try again.' };
    }
}
const getSubscriptionById = async (subscriptionId, log) => {
    log.info(`Fetching subscription with ID: ${subscriptionId}`);
    try {
        const subscription = await Subscription.findById(subscriptionId).lean();
        if (!subscription) {
            log.warn(`Subscription not found for ID: ${subscriptionId}`);
            throw { status: 404, message: 'Subscription not found.' };
        }
        log.info(`Subscription fetched successfully for ID: ${subscriptionId}`);
        return subscription;
    } catch (error) {
        log.error(`Error fetching subscription by ID: ${error.message}`);
        throw { status: error.status || 500, message: error.message || 'Failed to fetch subscription. Please try again.' };
    }
}
export default {
    getAllSubscriptions,
    getSubscriptionById
};

