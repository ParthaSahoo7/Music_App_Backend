// Downloads
// Continue Watching
// Playlist
// Favourites
// Watch Later

// const express = require('express');
// const { check } = require('express-validator');
// const authorizeUser = require('../../middlewares/authorizeUser');
// const mediaLibraryController = require('./mediaLibraryControllers');
import express from 'express';
import { check } from 'express-validator';
import authorizeUser from '../../middlewares/authorizeUser.js';
import mediaLibraryController from './mediaLibraryControllers.js';

const router = express.Router();

// Playlist Routes
router.post(
  '/playlists',
  authorizeUser,
  [
    check('name', 'Playlist name is required').notEmpty(),
    check('visibility', 'Invalid visibility').optional().isIn(['public', 'private', 'unlisted']),
  ],
  mediaLibraryController.createPlaylist
);

router.get(
  '/playlists',
  authorizeUser,
  mediaLibraryController.getUserPlaylists
);

router.get(
  '/playlists/:id',
  authorizeUser,
  [check('id', 'Valid playlist ID is required').isMongoId()],
  mediaLibraryController.getPlaylistById
);

router.put(
  '/playlists/:id',
  authorizeUser,
  [
    check('id', 'Valid playlist ID is required').isMongoId(),
    check('name', 'Playlist name must be a string').optional().isString(),
    check('description', 'Description must be a string').optional().isString(),
    check('visibility', 'Invalid visibility').optional().isIn(['public', 'private', 'unlisted']),
  ],
  mediaLibraryController.updatePlaylist
);

router.post(
  '/playlists/:id/add-media',
  authorizeUser,
  [
    check('id', 'Valid playlist ID is required').isMongoId(),
    check('mediaId', 'Valid media ID is required').isMongoId(),
  ],
  mediaLibraryController.addMediaToPlaylist
);

router.post(
  '/playlists/:id/remove-media',
  authorizeUser,
  [
    check('id', 'Valid playlist ID is required').isMongoId(),
    check('mediaId', 'Valid media ID is required').isMongoId(),
  ],
  mediaLibraryController.removeMediaFromPlaylist
);

router.delete(
  '/playlists/:id',
  authorizeUser,
  [check('id', 'Valid playlist ID is required').isMongoId()],
  mediaLibraryController.deletePlaylist
);

// Watching History Routes
router.post(
  '/watching-history',
  authorizeUser,
  [
    check('mediaId', 'Valid media ID is required').isMongoId(),
    check('lastWatchedPosition', 'Last watched position must be a non-negative number').isInt({ min: 0 }),
  ],
  mediaLibraryController.updateWatchingHistory
);

router.get(
  '/watching-history',
  authorizeUser,
  mediaLibraryController.getWatchingHistory
);

// Favourite Routes
router.post(
  '/favourites',
  authorizeUser,
  [check('mediaId', 'Valid media ID is required').isMongoId()],
  mediaLibraryController.addToFavourites
);

router.delete(
  '/favourites/:mediaId',
  authorizeUser,
  [check('mediaId', 'Valid media ID is required').isMongoId()],
  mediaLibraryController.removeFromFavourites
);

router.get(
  '/favourites',
  authorizeUser,
  mediaLibraryController.getFavourites
);

// Watch Later Routes
router.post(
  '/watch-later',
  authorizeUser,
  [check('mediaId', 'Valid media ID is required').isMongoId()],
  mediaLibraryController.addToWatchLater
);

router.delete(
  '/watch-later/:mediaId',
  authorizeUser,
  [check('mediaId', 'Valid media ID is required').isMongoId()],
  mediaLibraryController.removeFromWatchLater
);

router.get(
  '/watch-later',
  authorizeUser,
  mediaLibraryController.getWatchLater
);

// Download Routes
router.post(
  '/downloads',
  authorizeUser,
  [
    check('mediaId', 'Valid media ID is required').isMongoId(),
    check('mediaVariantId', 'Valid media variant ID is required').isMongoId(),
    check('resolution', 'Valid resolution is required').isIn(['240p', '480p', '720p', '1080p', '4K']),
    check('fileSize', 'File size must be a positive number').isInt({ min: 1 }),
  ],
  mediaLibraryController.initiateDownload
);

router.get(
  '/downloads',
  authorizeUser,
  mediaLibraryController.getDownloads
);

router.delete(
  '/downloads/:id',
  authorizeUser,
  [check('id', 'Valid download ID is required').isMongoId()],
  mediaLibraryController.deleteDownload
);

export default router;