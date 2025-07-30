import { validationResult } from 'express-validator';
import addressService from './addressServices.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';
import { createRequestLogger } from '../../utils/requestLogger.js';

const addAddress = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Adding new address');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during address addition');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for adding address',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    const addressData = req.body;

    const newAddress = await addressService.addAddress(userId, addressData, log);
    return res.status(201).json(successResponse(newAddress, 'Address added successfully.'));
  } catch (error) {
    log.error(`Error adding address: ${error.message}`);
    return res.status(500).json(errorResponse({
      message: 'Failed to add address. Please try again.',
    }, 500));
  }
};

const getAddresses = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching user addresses');

  try {
    const userId = req.user.userId;
    const addresses = await addressService.getAddresses(userId, false, log);
    return res.status(200).json(successResponse(addresses, 'Addresses fetched successfully.'));
  } catch (error) {
    log.error(`Error fetching addresses: ${error.message}`);
    return res.status(500).json(errorResponse({
      message: 'Failed to fetch addresses. Please try again.',
    }, 500));
  }
};

const updateAddress = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Updating address with ID: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during address update');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for updating address',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    const addressId = req.params.id;
    const updatedAddress = await addressService.updateAddress(userId, addressId, req.body, log);

    return res.status(200).json(successResponse(updatedAddress, 'Address updated successfully.'));
  } catch (error) {
    log.error(`Error updating address: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to update address.',
    }, 400));
  }
};

const deleteAddress = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Deleting address with ID: ${req.params.id}`);

  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    await addressService.deleteAddress(userId, addressId, log);

    return res.status(200).json(successResponse(null, 'Address deleted successfully.'));
  } catch (error) {
    log.error(`Error deleting address: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to delete address.',
    }, 400));
  }
};

const getAddressById = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Fetching address by ID: ${req.params.id}`);

  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    const address = await addressService.getAddressById(userId, addressId, log);

    return res.status(200).json(successResponse(address, 'Address retrieved successfully.'));
  } catch (error) {
    log.error(`Error fetching address: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch address.',
    }, 400));
  }
};

const getDefaultAddress = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching default addressssssssssssssss');

  try {
    const userId = req.user.userId;
    const defaultAddress = await addressService.getDefaultAddress(userId, log);

    return res.status(200).json(successResponse(defaultAddress, 'Default address retrieved successfully.'));
  } catch (error) {
    console.log("##############################################", error);
    log.error(`Error fetching default address: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch default address.',
    }, 400));
  }
};

const setDefaultAddress = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Setting default address with ID: ${req.params.id}`);

  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    const updatedAddress = await addressService.setDefaultAddress(userId, addressId, log);

    return res.status(200).json(successResponse(updatedAddress, 'Default address set successfully.'));
  } catch (error) {
    log.error(`Error setting default address: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to set default address.',
    }, 400));
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