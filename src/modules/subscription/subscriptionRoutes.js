import express from 'express';
import { check } from 'express-validator';
import subscriptionControllers from './subscriptionControllers.js';
import authorizeUser from '../../middlewares/authorizeUser.js';

const router = express.Router();

router.get(
    '/',
    authorizeUser,
    subscriptionControllers.getAllSubscriptions
)

router.get(
    '/:subscriptionId',
    [check('subscriptionId', 'Valid Subscription ID is required').isMongoId()],
    authorizeUser,
    subscriptionControllers.getSubscriptionById
);

router.get(
    '/user/:userId',
    [check('userId', 'Valid User ID is required').isMongoId()],
    authorizeUser,
    subscriptionControllers.getAllSubscriptions
);
export default router;