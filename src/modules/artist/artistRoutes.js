// get artist info
// update artist
// create artist
// delete artist

// const express = require('express');
// const { check } = require('express-validator');
// const authorizeUser = require('../../middlewares/authorizeUser');
// const artistController = require('./artistController');
import express from 'express';
import { check } from 'express-validator';
import authorizeUser from '../../middlewares/authorizeUser.js';
import artistController from './artistController.js';

const router = express.Router();

// Get all artists, with followed artists first
router.get(
  '/',
  authorizeUser,
  artistController.getAllArtists
);

// Create an artist
router.post(
  '/',
  authorizeUser,
  [
    check('name', 'Artist name is required').notEmpty().isString(),
    check('bio', 'Bio must be a string').optional().isString(),
    check('profilePicture', 'Profile picture URL must be a valid URL').optional().isURL(),
    check('socialLinks', 'Social links must be an object').optional().isObject(),
    check('genres', 'Genres must be an array of strings').optional().isArray(),
  ],
  artistController.createArtist
);

// Get artist info by ID
router.get(
  '/:id',
  [
    check('id', 'Valid artist ID is required').isMongoId(),
  ],
  artistController.getArtistById
);

// Update artist
router.put(
  '/:id',
  authorizeUser,
  [
    check('id', 'Valid artist ID is required').isMongoId(),
    check('name', 'Artist name must be a string').optional().isString(),
    check('bio', 'Bio must be a string').optional().isString(),
    check('profilePicture', 'Profile picture URL must be a valid URL').optional().isURL(),
    check('socialLinks', 'Social links must be an object').optional().isObject(),
    check('genres', 'Genres must be an array of strings').optional().isArray(),
  ],
  artistController.updateArtist
);

// Delete artist
router.delete(
  '/:id',
  authorizeUser,
  [
    check('id', 'Valid artist ID is required').isMongoId(),
  ],
  artistController.deleteArtist
);

// Follow an artist
router.post(
  '/:id/follow',
  authorizeUser,
  [
    check('id', 'Valid artist ID is required').isMongoId(),
  ],
  artistController.followArtist
);

router.use(
  '/:id/unfollow',
  authorizeUser,
  [
    check('id', 'Valid artist ID is required').isMongoId(),
  ],
  artistController.unfollowArtist
)

export default router;