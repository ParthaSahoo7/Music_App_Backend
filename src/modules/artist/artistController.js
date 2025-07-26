// const { validationResult } = require('express-validator');
// const artistService = require('./artistServices');
// const { successResponse, errorResponse } = require('../../utils/responseTemplate');
// const { createRequestLogger } = require('../../utils/requestLogger');
import { validationResult } from 'express-validator';
import artistService from './artistServices.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';  
import { createRequestLogger } from '../../utils/requestLogger.js';


const getAllArtists = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching all artists');

  try {
    const userId = req.user._id;
    const artists = await artistService.getAllArtists(userId);

    log.info('Artists retrieved successfully');
    return res.status(200).json(
      successResponse(
        artists,
        'Artists retrieved successfully'
      )
    );
  } catch (error) {
    log.error(`Error fetching artists: ${error.message}`);
    return res.status(500).json(
      errorResponse(
        {
          message: error.message || 'Failed to fetch artists',
        },
        500
      )
    );
  }
};

const createArtist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Incoming artist creation request');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during artist creation');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid input for creating artist',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user.userId;
    const artistData = req.body;
    const artist = await artistService.createArtist(userId, artistData);

    log.info(`Artist created successfully: ${artist.name}`);
    return res.status(201).json(
      successResponse(
        artist,
        `Artist ${artist.name} created successfully`,
        201
      )
    );
  } catch (error) {
    log.error(`Error creating artist: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to create artist',
        },
        400
      )
    );
  }
};

const getArtistById = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Fetching artist by ID: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during artist fetch');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid artist ID',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user?.userId; // Optional userId for checking follow status
    const artist = await artistService.getArtistById(req.params.id, userId);

    log.info(`Artist fetched successfully: ${artist.name}`);
    return res.status(200).json(
      successResponse(
        artist,
        'Artist retrieved successfully'
      )
    );
  } catch (error) {
    log.error(`Error fetching artist: ${error.message}`);
    return res.status(404).json(
      errorResponse(
        {
          message: error.message || 'Artist not found',
        },
        404
      )
    );
  }
};

const updateArtist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Updating artist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during artist update');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid input for updating artist',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user._id;
    const artist = await artistService.updateArtist(userId, req.params.id, req.body);

    log.info(`Artist updated successfully: ${artist.name}`);
    return res.status(200).json(
      successResponse(
        artist,
        `Artist ${artist.name} updated successfully`
      )
    );
  } catch (error) {
    log.error(`Error updating artist: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to update artist',
        },
        400
      )
    );
  }
};

const deleteArtist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Deleting artist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during artist deletion');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid artist ID',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user._id;
    await artistService.deleteArtist(userId, req.params.id);

    log.info(`Artist deleted successfully: ${req.params.id}`);
    return res.status(200).json(
      successResponse(
        {},
        'Artist deleted successfully'
      )
    );
  } catch (error) {
    log.error(`Error deleting artist: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to delete artist',
        },
        400
      )
    );
  }
};

const followArtist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`User attempting to follow artist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during artist follow');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid artist ID',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user._id;
    const artistId = req.params.id;
    const result = await artistService.followArtist(userId, artistId);

    log.info(`User followed artist: ${artistId}`);
    return res.status(200).json(
      successResponse(
        result,
        'Artist followed successfully'
      )
    );
  } catch (error) {
    log.error(`Error following artist: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to follow artist',
        },
        400
      )
    );
  }
};

const unfollowArtist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`User attempting to unfollow artist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during artist unfollow');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid artist ID',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user._id;
    const artistId = req.params.id;
    const result = await artistService.unfollowArtist(userId, artistId);

    log.info(`User unfollowed artist: ${artistId}`);
    return res.status(200).json(
      successResponse(
        result,
        'Artist unfollowed successfully'
      )
    );
  } catch (error) {
    log.error(`Error unfollowing artist: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to unfollow artist',
        },
        400
      )
    );
  }
};
export default {
  getAllArtists,
  createArtist,
  getArtistById,
  updateArtist,
  deleteArtist,
  followArtist,
  unfollowArtist,
};