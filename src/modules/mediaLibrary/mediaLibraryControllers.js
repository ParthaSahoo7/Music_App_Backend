// const { validationResult } = require('express-validator');
// const mediaLibraryService = require('./mediaLibraryServices');
// const { successResponse, errorResponse } = require('../../utils/responseTemplate');
// const { createRequestLogger } = require('../../utils/requestLogger');

import { validationResult } from 'express-validator';
import mediaLibraryService from './mediaLibraryServices.js';
import { successResponse, errorResponse } from '../../utils/responseTemplate.js';
import { createRequestLogger } from '../../utils/requestLogger.js';

const createPlaylist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Creating playlist');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during playlist creation');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for creating playlist',
        errors: errors.array(),
      }, 400));
    }

    const { name, description, mediaItems, thumbnailUrl } = req.body;
    const userId = req.user.userId;

    const playlist = await mediaLibraryService.createPlaylist(userId, { name, description, mediaItems, thumbnailUrl });

    return res.status(201).json(successResponse(playlist, 'Playlist created successfully'));
  } catch (error) {
    log.error(`Error creating playlist: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to create playlist',
    }, 400));
  }
};

const getUserPlaylists = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching user playlists');

  try {
    const userId = req.user.userId;
    const playlists = await mediaLibraryService.getUserPlaylists(userId, req.query, log);

    return res.status(200).json(successResponse(playlists, 'Playlists retrieved successfully'));
  } catch (error) {
    log.error(`Error fetching playlists: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch playlists',
    }, 400));
  }
};

const getPlaylistById = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Fetching playlist by ID: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during playlist fetch');
      return res.status(400).json(errorResponse({
        message: 'Invalid playlist ID',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    const playlist = await mediaLibraryService.getPlaylistById(userId, req.params.id, log);

    return res.status(200).json(successResponse(playlist, 'Playlist retrieved successfully'));
  } catch (error) {
    log.error(`Error fetching playlist: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch playlist',
    }, 400));
  }
};

const updatePlaylist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Updating playlist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during playlist update');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for updating playlist',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    const playlist = await mediaLibraryService.updatePlaylist(userId, req.params.id, req.body);

    return res.status(200).json(successResponse(playlist, 'Playlist updated successfully'));
  } catch (error) {
    log.error(`Error updating playlist: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to update playlist',
    }, 400));
  }
};

const addMediaToPlaylist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Adding media to playlist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`Validation errors: ${JSON.stringify(errors.array())}`);
      log.warn('Validation failed during adding media to playlist');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for adding media to playlist',
        errors: errors.array(),
      }, 400));
    }

    const { mediaId } = req.body;
    const userId = req.user.userId;

    const playlist = await mediaLibraryService.addMediaToPlaylist(userId, req.params.id, mediaId);

    return res.status(200).json(successResponse(playlist, 'Media added to playlist successfully'));
  } catch (error) {
    log.error(`Error adding media to playlist: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to add media to playlist',
    }, 400));
  }
};

const removeMediaFromPlaylist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Removing media from playlist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during removing media from playlist');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for removing media from playlist',
        errors: errors.array(),
      }, 400));
    }

    const { mediaId } = req.body;
    const userId = req.user.userId;

    const playlist = await mediaLibraryService.removeMediaFromPlaylist(userId, req.params.id, mediaId);

    return res.status(200).json(successResponse(playlist, 'Media removed from playlist successfully'));
  } catch (error) {
    log.error(`Error removing media from playlist: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to remove media from playlist',
    }, 400));
  }
};

const deletePlaylist = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Deleting playlist: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during playlist deletion');
      return res.status(400).json(errorResponse({
        message: 'Invalid playlist ID',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    await mediaLibraryService.deletePlaylist(userId, req.params.id);

    return res.status(200).json(successResponse(null, 'Playlist deleted successfully'));
  } catch (error) {
    log.error(`Error deleting playlist: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to delete playlist',
    }, 400));
  }
};

const updateWatchingHistory = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Updating watching history');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during watching history update');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for updating watching history',
        errors: errors.array(),
      }, 400));
    }

    const { mediaId, lastWatchedPosition, isCompleted } = req.body;
    const userId = req.user._id;

    const history = await mediaLibraryService.updateWatchingHistory(userId, mediaId, { lastWatchedPosition, isCompleted });

    return res.status(200).json(successResponse(history, 'Watching history updated successfully'));
  } catch (error) {
    log.error(`Error updating watching history: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to update watching history',
    }, 400));
  }
};

const getWatchingHistory = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching watching history');

  try {
    const userId = req.user._id;
    const history = await mediaLibraryService.getWatchingHistory(userId);

    return res.status(200).json(successResponse(history, 'Watching history retrieved successfully'));
  } catch (error) {
    log.error(`Error fetching watching history: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch watching history',
    }, 400));
  }
};

const addToFavourites = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Adding to favourites');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during adding to favourites');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for adding to favourites',
        errors: errors.array(),
      }, 400));
    }

    const { mediaId } = req.body;
    const userId = req.user.userId;

    const favourite = await mediaLibraryService.addToFavourites(userId, mediaId);

    return res.status(200).json(successResponse(favourite, 'Media added to favourites successfully'));
  } catch (error) {
    log.error(`Error adding to favourites: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to add to favourites',
    }, 400));
  }
};

const removeFromFavourites = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Removing from favourites: ${req.params.mediaId}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during removing from favourites');
      return res.status(400).json(errorResponse({
        message: 'Invalid media ID',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    await mediaLibraryService.removeFromFavourites(userId, req.params.mediaId);

    return res.status(200).json(successResponse(null, 'Media removed from favourites successfully'));
  } catch (error) {
    log.error(`Error removing from favourites: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to remove from favourites',
    }, 400));
  }
};

const getFavourites = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching favourites');

  try {
    const userId = req.user.userId;
    const favourites = await mediaLibraryService.getFavourites(userId);

    return res.status(200).json(successResponse(favourites, 'Favourites retrieved successfully'));
  } catch (error) {
    log.error(`Error fetching favourites: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch favourites',
    }, 400));
  }
};

const addToWatchLater = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Adding to watch later');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during adding to watch later');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for adding to watch later',
        errors: errors.array(),
      }, 400));
    }

    const { mediaId } = req.body;
    const userId = req.user.userId;

    const watchLater = await mediaLibraryService.addToWatchLater(userId, mediaId);

    return res.status(200).json(successResponse(watchLater, 'Media added to watch later successfully'));
  } catch (error) {
    log.error(`Error adding to watch later: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to add to watch later',
    }, 400));
  }
};

const removeFromWatchLater = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Removing from watch later: ${req.params.mediaId}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during removing from watch later');
      return res.status(400).json(errorResponse({
        message: 'Invalid media ID',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    await mediaLibraryService.removeFromWatchLater(userId, req.params.mediaId);

    return res.status(200).json(successResponse(null, 'Media removed from watch later successfully'));
  } catch (error) {
    log.error(`Error removing from watch later: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to remove from watch later',
    }, 400));
  }
};

const getWatchLater = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching watch later');

  try {
    const userId = req.user.userId;
    const watchLater = await mediaLibraryService.getWatchLater(userId);

    return res.status(200).json(successResponse(watchLater, 'Watch later list retrieved successfully'));
  } catch (error) {
    log.error(`Error fetching watch later: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch watch later list',
    }, 400));
  }
};

const initiateDownload = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Initiating download');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during download initiation');
      return res.status(400).json(errorResponse({
        message: 'Invalid input for initiating download',
        errors: errors.array(),
      }, 400));
    }

    const { mediaId, mediaVariantId, resolution, fileSize } = req.body;
    const userId = req.user.userId;

    const download = await mediaLibraryService.initiateDownload(userId, { mediaId, mediaVariantId, resolution, fileSize });

    return res.status(201).json(successResponse(download, 'Download initiated successfully'));
  } catch (error) {
    log.error(`Error initiating download: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to initiate download',
    }, 400));
  }
};

const getDownloads = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Fetching downloads');

  try {
    const userId = req.user.userId;
    const downloads = await mediaLibraryService.getDownloads(userId);

    return res.status(200).json(successResponse(downloads, 'Downloads retrieved successfully'));
  } catch (error) {
    log.error(`Error fetching downloads: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to fetch downloads',
    }, 400));
  }
};

const deleteDownload = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Deleting download: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during download deletion');
      return res.status(400).json(errorResponse({
        message: 'Invalid download ID',
        errors: errors.array(),
      }, 400));
    }

    const userId = req.user.userId;
    await mediaLibraryService.deleteDownload(userId, req.params.id);

    return res.status(200).json(successResponse(null, 'Download deleted successfully'));
  } catch (error) {
    log.error(`Error deleting download: ${error.message}`);
    return res.status(400).json(errorResponse({
      message: error.message || 'Failed to delete download',
    }, 400));
  }
};

export default {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  updatePlaylist,
  addMediaToPlaylist,
  removeMediaFromPlaylist,
  deletePlaylist,
  updateWatchingHistory,
  getWatchingHistory,
  addToFavourites,
  removeFromFavourites,
  getFavourites,
  addToWatchLater,
  removeFromWatchLater,
  getWatchLater,
  initiateDownload,
  getDownloads,
  deleteDownload,
};