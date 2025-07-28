import Address from './../../models/Address.js';
import { validationResult } from 'express-validator';
import UserAuth from '../../models/UserAuth.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';
import { createRequestLogger } from '../../utils/requestLogger.js';


//   addAddress,

const addAddress = async( userId, addressData ) => {
    const log = createRequestLogger();
    log.info('Adding new address', { userId, addressData });

    try {
        const address = new Address({
            ...addressData,
            user: userId
        });
        const savedAddress = await address.save();
        log.info('Address added successfully', { addressId: savedAddress._id });
        return savedAddress;
    } catch (error) {
        log.error('Error adding address', { error: error.message });
        throw new Error('Failed to add address. Please try again.');
    }
};

//   getAddresses (isDeleted = false),

const getAddresses = async(userId, isDeleted = false) => {
    const log = createRequestLogger();
    log.info('Fetching addresses', { userId, isDeleted });
    try {
        const addresses = await Address.find({ user: userId, isDeleted: isDeleted });
        log.info('Addresses fetched successfully', { count: addresses.length });
        return addresses;
    } catch (error) {
        log.error('Error fetching addresses', { error: error.message });
        throw new Error('Failed to fetch addresses. Please try again.');
    }
};
//   updateAddress,

const updateAddress = async(userId, addressId, addressData) => {
    const log = createRequestLogger();
    log.info('Updating address', { userId, addressId, addressData });
    try {
        const address = await Address.findOneAndUpdate(
            { _id: addressId, user: userId },
            addressData,
            { new: true }
        );
        if (!address) {
            log.warn('Address not found or does not belong to user', { addressId, userId });
            throw new Error('Address not found or does not belong to user.');
        }
        log.info('Address updated successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error updating address', { error: error.message });
        throw new Error('Failed to update address. Please try again.');
    }
};
//   deleteAddress (soft delete),

const deleteAddress = async(userId, addressId) => {
    const log = createRequestLogger();
    log.info('Deleting address', { userId, addressId });
    try {
        const address = await Address.findOneAndUpdate(
            { _id: addressId, user: userId },
            { isDeleted: true },
            { new: true }
        );
        if (!address) { 
            log.warn('Address not found or does not belong to user', { addressId, userId });
            throw new Error('Address not found or does not belong to user.');
        }
        log.info('Address deleted successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error deleting address', { error: error.message });
        throw new Error('Failed to delete address. Please try again.');
    }
};
//   getAddressById,

const getAddressById = async(userId, addressId) => {
    const log = createRequestLogger();
    log.info('Fetching address by ID', { userId, addressId });
    try {
        const address = await Address.findOne({ _id: addressId, user: userId });
        if (!address) {
            log.warn('Address not found or does not belong to user', { addressId, userId });
            throw new Error('Address not found or does not belong to user.');
        }
        log.info('Address fetched successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error fetching address', { error: error.message });
        throw new Error('Failed to fetch address. Please try again.');
    }
};
//   getDefaultAddress,

const getDefaultAddress = async(userId) => {
    const log = createRequestLogger();
    log.info('Fetching default address', { userId });
    try {
        const address = await Address.findOne({ user: userId, isDefault: true, isDeleted: false });
        if (!address) {
            log.warn('Default address not found for user', { userId });
            throw new Error('Default address not found for user.');
        }
        log.info('Default address fetched successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error fetching default address', { error: error.message });
        throw new Error('Failed to fetch default address. Please try again.');
    }
};
//   setDefaultAddress

const setDefaultAddress = async(userId, addressId) => {
    const log = createRequestLogger();
    log.info('Setting default address', { userId, addressId });
    try {
        // Clear existing default address
        await Address.updateMany({ user: userId, isDefault: true }, { isDefault: false });

        // Set new default address
        const address = await Address.findOneAndUpdate(
            { _id: addressId, user: userId },
            { isDefault: true },
            { new: true }
        );
        if (!address) {
            log.warn('Address not found or does not belong to user', { addressId, userId });
            throw new Error('Address not found or does not belong to user.');
        }
        log.info('Default address set successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error setting default address', { error: error.message });
        throw new Error('Failed to set default address. Please try again.');
    }
}   

export default {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress,
    getAddressById,
    getDefaultAddress,
    setDefaultAddress
};