import Address from './../../models/Address.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';

const addAddress = async (userId, addressData, log) => {
    log.info('Adding new address', { userId, addressData });

    try {
        // Check if user has any existing non-deleted addresses
        const existingAddresses = await Address.find({ user: userId, isDeleted: false });
        const isFirstAddress = existingAddresses.length === 0;

        // If the new address is set as default, clear existing defaults
        if (addressData.isDefault) {
            await Address.updateMany(
                { user: userId, isDefault: true, isDeleted: false },
                { isDefault: false }
            );
        }

        const address = new Address({
            ...addressData,
            user: userId,
            isDefault: isFirstAddress ? true : (addressData.isDefault || false)
        });
        const savedAddress = await address.save();
        log.info('Address added successfully', { addressId: savedAddress._id });
        return savedAddress;
    } catch (error) {
        log.error('Error adding address', { error: error.message });
        throw new Error('Failed to add address. Please try again.');
    }
};

const getAddresses = async (userId, isDeleted = false, log) => {
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

const updateAddress = async (userId, addressId, addressData, log) => {
    log.info('Updating address', { userId, addressId, addressData });
    try {
        // If updating to set as default, clear other defaults
        if (addressData.isDefault) {
            await Address.updateMany(
                { user: userId, isDefault: true, isDeleted: false },
                { isDefault: false }
            );
        }

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

const deleteAddress = async (userId, addressId, log) => {
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

        // If the deleted address was default, check if other addresses exist
        if (address.isDefault) {
            const remainingAddresses = await Address.find({ 
                user: userId, 
                isDeleted: false, 
                _id: { $ne: addressId } 
            });
            if (remainingAddresses.length > 0) {
                // Set the first remaining address as default
                await Address.findOneAndUpdate(
                    { _id: remainingAddresses[0]._id, user: userId },
                    { isDefault: true },
                    { new: true }
                );
                log.info('New default address set', { newDefaultAddressId: remainingAddresses[0]._id });
            }
        }

        log.info('Address deleted successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error deleting address', { error: error.message });
        throw new Error('Failed to delete address. Please try again.');
    }
};

const getAddressById = async (userId, addressId, log) => {
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

const getDefaultAddress = async (userId, log) => {
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

const setDefaultAddress = async (userId, addressId, log) => {
    log.info('Setting default address', { userId, addressId });
    try {
        // Clear existing default address
        await Address.updateMany(
            { user: userId, isDefault: true, isDeleted: false },
            { isDefault: false }
        );

        // Set new default address
        const address = await Address.findOneAndUpdate(
            { _id: addressId, user: userId, isDeleted: false },
            { isDefault: true },
            { new: true }
        );
        if (!address) {
            log.warn('Address not found, does not belong to user, or is deleted', { addressId, userId });
            throw new Error('Address not found, does not belong to user, or is deleted.');
        }
        log.info('Default address set successfully', { addressId: address._id });
        return address;
    } catch (error) {
        log.error('Error setting default address', { error: error.message });
        throw new Error('Failed to set default address. Please try again.');
    }
};

export default {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress,
    getAddressById,
    getDefaultAddress,
    setDefaultAddress
};