// const { validationResult } = require('express-validator');
// const mediaService = require('./mediaServices');
// const { successResponse, errorResponse } = require('../../utils/responseTemplate');
// const { createRequestLogger } = require('../../utils/requestLogger');
import { validationResult } from "express-validator";
import mediaService from "./mediaServices.js";
import {
  successResponse,
  errorResponse,
} from "../../utils/responseTemplate.js";
import { createRequestLogger } from "../../utils/requestLogger.js";

const initiateUploadController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Initiating media upload");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during initiate upload");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for initiating upload",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { filename, contentType } = req.body;
    const userId = req.user.userId;

    const { uploadId, key } = await mediaService.initiateUpload(userId, {
      filename,
      contentType,
    });
    console.log("uploadId", uploadId);
    console.log("key", key);
    return res.status(200).json(
      successResponse(
        {
          uploadId,
          key,
        },
        "Multipart upload initiated successfully. Request presigned URLs for parts."
      )
    );
  } catch (error) {
    console.log("error", error);
    log.error(`Error initiating upload: ${error.message}`);
    return res.status(500).json(
      errorResponse(
        {
          message: "Failed to initiate upload. Please try again.",
        },
        500
      )
    );
  }
};

const getPresignedUrlsController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Generating presigned URLs for multipart upload");
  console.log("req.body", req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during presigned URLs generation");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for generating presigned URLs",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { uploadId, key, partNumbers } = req.body;
    const userId = req.user.userId;

    const urls = await mediaService.getPresignedUrls(
      userId,
      uploadId,
      key,
      partNumbers
    );

    return res
      .status(200)
      .json(successResponse(urls, "Presigned URLs generated successfully."));
  } catch (error) {
    log.error(`Error generating presigned URLs: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to generate presigned URLs.",
        },
        400
      )
    );
  }
};

const completeUploadController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Completing media upload");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during complete upload");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for completing upload",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const {
      uploadId,
      key,
      title,
      description,
      type,
      genres,
      tags,
      
      parts,
    } = req.body;
    const userId = req.user.userId;

    const media = await mediaService.completeUpload(userId, {
      uploadId,
      key,
      title,
      description,
      type,
      genres: Array.isArray(genres)
        ? genres
        : typeof genres === "string"
        ? genres.split(",")
        : [],
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",")
        : [],
      
      parts,
    });

    return res.status(200).json(
      successResponse(
        {
          mediaId: media._id,
          transcodingStatus: media.transcodingStatus,
        },
        "Upload completed. Transcoding started."
      )
    );
  } catch (error) {
    console.log("error", error);
    log.error(`Error completing upload: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to complete upload.",
        },
        400
      )
    );
  }
};

const initiateThumbnailUploadController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Initiating thumbnail upload');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during thumbnail upload initiation');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid input for initiating thumbnail upload',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { mediaId, filename, contentType } = req.body;
    const userId = req.user.userId;

    const { presignedUrl, key } = await mediaService.initiateThumbnailUpload(userId, mediaId, {
      filename,
      contentType,
    });

    return res.status(200).json(
      successResponse(
        { presignedUrl, key },
        'Presigned URL for thumbnail upload generated successfully.'
      )
    );
  } catch (error) {
    log.error(`Error initiating thumbnail upload: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to initiate thumbnail upload.',
        },
        400
      )
    );
  }
};

const uploadThumbnailController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info('Completing thumbnail upload');

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn('Validation failed during thumbnail upload');
      return res.status(400).json(
        errorResponse(
          {
            message: 'Invalid input for thumbnail upload',
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { mediaId, key } = req.body;
    const userId = req.user.userId;

    const result = await mediaService.uploadThumbnail(userId, mediaId, key);

    return res.status(200).json(
      successResponse(result, 'Thumbnail uploaded successfully.')
    );
  } catch (error) {
    log.error(`Error uploading thumbnail: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || 'Failed to upload thumbnail.',
        },
        400
      )
    );
  }
};

const abortUploadController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Aborting media upload");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during abort upload");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for aborting upload",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { uploadId, key } = req.body;
    const userId = req.user.userId;

    const result = await mediaService.abortUpload(userId, uploadId, key);

    return res
      .status(200)
      .json(successResponse(result, "Multipart upload aborted successfully."));
  } catch (error) {
    log.error(`Error aborting upload: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to abort upload.",
        },
        400
      )
    );
  }
};

const getMediaAccessUrlController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Generating media access URL");

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during media access URL generation");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for generating media access URL",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const { mediaId, variantResolution } = req.body;
    const userId = req.user.userId;

    const accessUrl = await mediaService.getMediaAccessUrl(
      userId,
      mediaId,
      variantResolution
    );

    return res.status(200).json(
      successResponse(
        {
          accessUrl,
        },
        "Media access URL generated successfully."
      )
    );
  } catch (error) {
    log.error(`Error generating media access URL: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to generate media access URL.",
        },
        400
      )
    );
  }
};

const getAllMediaController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info("Fetching all media");

  try {
    const userId = req.user.userId;
    const mediaList = await mediaService.getAllMedia(userId, req.query);

    // const mediaWithVariants = await Promise.all(
    //   mediaList.map(async (media) => {
    //     const variants = await mediaService.getAllMediaVariant(media._id);
    //     return {
    //       media,
    //       variants,
    //     };
    //   })
    // );

    return res
      .status(200)
      .json(successResponse(mediaList, "Media retrieved successfully"));
  } catch (error) {
    log.error(`Error fetching media: ${error.message}`);
    return res.status(500).json(
      errorResponse(
        {
          message: "Failed to fetch media.",
        },
        500
      )
    );
  }
};



const getMediaByIdController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Fetching media by ID: ${req.params.id}`);

  try {
    const userId = req.user.userId;
    const media = await mediaService.getMediaById(userId, req.params.id);

    return res
      .status(200)
      .json(successResponse(media, "Media retrieved successfully"));
  } catch (error) {
    log.error(`Error fetching media: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to fetch media.",
        },
        400
      )
    );
  }
};

const updateMediaController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Updating media: ${req.params.id}`);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      log.warn("Validation failed during media update");
      return res.status(400).json(
        errorResponse(
          {
            message: "Invalid input for updating media",
            errors: errors.array(),
          },
          400
        )
      );
    }

    const userId = req.user.userId;
    const media = await mediaService.updateMedia(
      userId,
      req.params.id,
      req.body
    );

    return res
      .status(200)
      .json(successResponse(media, "Media updated successfully"));
  } catch (error) {
    log.error(`Error updating media: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to update media.",
        },
        400
      )
    );
  }
};

const deleteMediaController = async (req, res) => {
  const log = createRequestLogger(req);
  log.info(`Deleting media: ${req.params.id}`);

  try {
    const userId = req.user.userId;
    const result = await mediaService.deleteMedia(userId, req.params.id);

    return res
      .status(200)
      .json(successResponse(result, "Media deleted successfully"));
  } catch (error) {
    log.error(`Error deleting media: ${error.message}`);
    return res.status(400).json(
      errorResponse(
        {
          message: error.message || "Failed to delete media.",
        },
        400
      )
    );
  }
};

// const uploadThumbnailController = async (req, res) => {
//   const log = createRequestLogger(req);
//   log.info("Uploading thumbnail for media");

//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       log.warn("Validation failed during thumbnail upload");
//       return res.status(400).json(
//         errorResponse(
//           {
//             message: "Invalid input for thumbnail upload",
//             errors: errors.array(),
//           },
//           400
//         )
//       );
//     }

//     const { mediaId, thumbnailUrl } = req.body;
//     const userId = req.user.userId;

//     const result = await mediaService.uploadThumbnail(
//       userId,
//       mediaId,
//       thumbnailUrl
//     );

//     return res
//       .status(200)
//       .json(successResponse(result, "Thumbnail uploaded successfully"));
//   } catch (error) {
//     log.error(`Error uploading thumbnail: ${error.message}`);
//     return res.status(400).json(
//       errorResponse(
//         {
//           message: error.message || "Failed to upload thumbnail.",
//         },
//         400
//       )
//     );
//   }
// };

export default {
  initiateUploadController,
  getPresignedUrlsController,
  completeUploadController,
  abortUploadController,
  getMediaAccessUrlController,
  getAllMediaController,
  getMediaByIdController,
  updateMediaController,
  deleteMediaController,
  uploadThumbnailController,
  initiateThumbnailUploadController
};
