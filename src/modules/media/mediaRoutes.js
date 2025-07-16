const express = require('express');
const { check } = require('express-validator');
const authorizeUser = require('../../middlewares/authorizeUser');
const mediaController = require('./mediaControllers');

const router = express.Router();

router.post(
  '/initiate-upload',
  authorizeUser,
  [
    check('filename', 'Filename is required').notEmpty(),
    check('contentType', 'Content Type is required').notEmpty(),
  ],
  mediaController.initiateUploadController
);

router.post(
  '/presigned-urls',
  authorizeUser,
  [
    check('uploadId', 'Upload ID is required').notEmpty(),
    check('key', 'S3 key is required').notEmpty(),
    check('partNumbers', 'Part numbers must be an array of integers').isArray({ min: 1 }).custom((value) => {
      return value.every(num => Number.isInteger(num) && num >= 1);
    }),
  ],
  mediaController.getPresignedUrlsController
);

router.post(
  '/complete-upload',
  authorizeUser,
  [
    check('uploadId', 'Upload ID is required').notEmpty(),
    check('key', 'S3 key is required').notEmpty(),
    check('duration', 'Duration is required').isNumeric(),
    check('title', 'Title is required').notEmpty(),
    check('type', 'Media type is required').isIn(['movie', 'music', 'podcast']),
    check('parts', 'Parts must be an array').isArray({ min: 1 }),
  ],
  mediaController.completeUploadController
);

router.post(
  '/abort-upload',
  authorizeUser,
  [
    check('uploadId', 'Upload ID is required').notEmpty(),
    check('key', 'S3 key is required').notEmpty(),
  ],
  mediaController.abortUploadController
);

router.post(
  '/media-access-url',
  authorizeUser,
  [
    check('mediaId', 'Media ID is required').isMongoId(),
    check('variantResolution', 'Variant resolution is required').optional().isIn(['240p', '480p', '720p', '1080p', '4K']),
  ],
  mediaController.getMediaAccessUrlController
);

router.get(
  '/all',
  authorizeUser,
  mediaController.getAllMediaController
);

router.get(
  '/:id',
  authorizeUser,
  [check('id', 'Valid media ID is required').isMongoId()],
  mediaController.getMediaByIdController
);

router.put(
  '/:id',
  authorizeUser,
  [
    check('id', 'Valid media ID is required').isMongoId(),
    check('title', 'Title must be a string').optional().isString(),
    check('description', 'Description must be a string').optional().isString(),
    check('visibility', 'Invalid visibility').optional().isIn(['public', 'private', 'unlisted']),
    check('genres', 'Genres must be a string').optional().isString(),
    check('tags', 'Tags must be a string').optional().isString(),
  ],
  mediaController.updateMediaController
);

router.delete(
  '/:id',
  authorizeUser,
  [check('id', 'Valid mediaId is required').isMongoId()],
  mediaController.deleteMediaController
);

module.exports = router;