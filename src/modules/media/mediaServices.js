// const { v4: uuidv4 } = require('uuid');
// const {
//   S3Client,
//   CreateMultipartUploadCommand,
//   UploadPartCommand,
//   CompleteMultipartUploadCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
//   ListMultipartUploadsCommand,
//   AbortMultipartUploadCommand,
// } = require('@aws-sdk/client-s3');
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// const {
//   MediaConvertClient,
//   CreateJobCommand,
// } = require('@aws-sdk/client-mediaconvert');
// const Media = require('../../models/Media');
// const MediaVariant = require('../../models/MediaVariant');
// const UserAuth = require('../../models/UserAuth');
// const { createRequestLogger } = require('../../utils/requestLogger');
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaConvertClient, CreateJobCommand,GetJobCommand } from '@aws-sdk/client-mediaconvert';
import Media from '../../models/Media.js';
import MediaVariant from '../../models/MediaVariant.js';
import UserAuth from '../../models/UserAuth.js';
import { createRequestLogger } from '../../utils/requestLogger.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize S3 client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION
});

// Initialize MediaConvert client (v3)
const mediaConvert = new MediaConvertClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT
});

const initiateUpload = async (userId, { filename, contentType }) => {
  const log = createRequestLogger({ userId });
  log.info(`Initiating multipart upload for file: ${filename}`);

  const key = `uploads/${userId}/${uuidv4()}/${filename}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const result = await s3.send(command);
  log.info(`Multipart upload initiated for key: ${key}`);

  return { uploadId: result.UploadId, key };
};

const getPresignedUrls = async (userId, uploadId, key, partNumbers) => {
  const log = createRequestLogger({ userId });
  log.info(`Generating presigned URLs for uploadId: ${uploadId}, key: ${key}`);

  // Validate that the multipart upload exists
  const listCommand = new ListMultipartUploadsCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Prefix: `uploads/${userId}/`,
  });
  const { Uploads } = await s3.send(listCommand);
  const uploadExists = Uploads?.some(upload => upload.UploadId === uploadId && upload.Key === key);
  if (!uploadExists) {
    throw new Error('Multipart upload not found or unauthorized');
  }

  const urls = [];
  for (let partNumber = 1; partNumber <= partNumbers; partNumber++) {
    const command = new UploadPartCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    urls.push({ partNumber, url });
  }

  log.info(`Generated ${urls.length} presigned URLs`);
  return urls;
};

const completeUpload = async (userId, { uploadId, key, title, description, type, genres, tags,  parts }) => {
  const log = createRequestLogger({ userId });
  log.info(`Completing multipart upload for key: ${key}`);

  // Validate that the multipart upload exists
  const listCommand = new ListMultipartUploadsCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Prefix: `uploads/${userId}/`,
  });
  const { Uploads } = await s3.send(listCommand);
  const uploadExists = Uploads?.some(upload => upload.UploadId === uploadId && upload.Key === key);
  if (!uploadExists) {
    throw new Error('Multipart upload not found or unauthorized');
  }

  // Complete the multipart upload
  const completeCommand = new CompleteMultipartUploadCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3.send(completeCommand);

  const user = await UserAuth.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const uploaderType = user.role === 'admin' || user.role === 'artist' ? user.role : 'artist';

  const media = new Media({
    uploadedBy: userId,
    uploaderType,
    s3KeyOriginal: key,
    uploadId,
    title,
    description,
    type,
    genres: Array.isArray(genres) ? genres : (typeof genres === 'string' ? genres.split(',') : []),
    tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',') : []),

    transcodingStatus: 'processing',
  });

  await media.save();

  const job = await createMediaConvertJob(media);
  media.mediaConvertJobId = job.Job.Id;
  await media.save();

  log.info(`MediaConvert job created: ${job.Job.Id}`);
  return media;
};


const createMediaConvertJob = async (media) => {
  const outputS3Prefix = `transcoded/${media._id}/`;
  const settings = {
    TimecodeConfig: { Source: 'ZEROBASED' },
    OutputGroups: [
      {
        Name: 'HLS Group',
        OutputGroupSettings: {
          Type: 'HLS_GROUP_SETTINGS',
          HlsGroupSettings: {
            Destination: `s3://${process.env.AWS_S3_BUCKET}/${outputS3Prefix}`,
            SegmentLength: 6,
            MinSegmentLength: 0,
          },
        },
        Outputs: [
          {
            NameModifier: '_240p',
            VideoDescription: {
              Width: 426,
              Height: 240,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 500000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                AudioFramesPerPes: 4,
                PcrControl: 'PCR_EVERY_PES_PACKET',
              },
            },
          },
          {
            NameModifier: '_480p',
            VideoDescription: {
              Width: 854,
              Height: 480,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 1000000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                AudioFramesPerPes: 4,
                PcrControl: 'PCR_EVERY_PES_PACKET',
              },
            },
          },
          {
            NameModifier: '_720p',
            VideoDescription: {
              Width: 1280,
              Height: 720,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 2500000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                AudioFramesPerPes: 4,
                PcrControl: 'PCR_EVERY_PES_PACKET',
              },
            },
          },
          {
            NameModifier: '_1080p',
            VideoDescription: {
              Width: 1920,
              Height: 1080,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 5000000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                AudioFramesPerPes: 4,
                PcrControl: 'PCR_EVERY_PES_PACKET',
              },
            },
          },
          {
            NameModifier: '_1440p',
            VideoDescription: {
              Width: 2560,
              Height: 1440,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 8000000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                AudioFramesPerPes: 4,
                PcrControl: 'PCR_EVERY_PES_PACKET',
              },
            },
          },
          {
            NameModifier: '_2160p',
            VideoDescription: {
              Width: 3840,
              Height: 2160,
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 1500000,
                },
              },
            },
            AudioDescriptions: [
              {
                CodecSettings: {
                  Codec: 'AAC',
                  AacSettings: {
                    Bitrate: 96000,
                    CodingMode: 'CODING_MODE_2_0',
                    SampleRate: 48000,
                  },
                },
              },
            ],
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {
                AudioFramesPerPes: 4,
                PcrControl: 'PCR_EVERY_PES_PACKET',
              },
            },
          },
        ],
      },
    ],
    Inputs: [
      {
        FileInput: `s3://${process.env.AWS_S3_BUCKET}/${media.s3KeyOriginal}`,
        AudioSelectors: {
          'Audio Selector 1': {
            DefaultSelection: 'DEFAULT',
          },
        },
      },
    ],
  };

  const params = {
    Role: process.env.AWS_MEDIACONVERT_ROLE,
    Settings: settings,
    Queue: process.env.AWS_MEDIACONVERT_QUEUE,
    UserMetadata: {
      mediaId: media._id.toString(),
    },
  };

  return await mediaConvert.send(new CreateJobCommand(params));
};

const saveMediaVariants = async (mediaId) => {
  const log = createRequestLogger({ mediaId });
  log.info(`Saving media variants and master playlist for mediaId: ${mediaId}`);

  const media = await Media.findById(mediaId);
  if (!media) throw new Error('Media not found');

  // Extract original filename (e.g., 0724.mp4 → 0724)
  const originalKey = media.s3KeyOriginal.split('/').pop(); // "0724.mp4"
  const baseName = originalKey.replace(/\.[^/.]+$/, ''); // Remove .mp4

  const baseUrl = `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}`;

  const variants = [
    { resolution: '240p', streamUrl: `${baseUrl}/${baseName}_240p.m3u8`, format: 'hls', bitrate: 500 },
    { resolution: '480p', streamUrl: `${baseUrl}/${baseName}_480p.m3u8`, format: 'hls', bitrate: 1000 },
    { resolution: '720p', streamUrl: `${baseUrl}/${baseName}_720p.m3u8`, format: 'hls', bitrate: 2500 },
    { resolution: '1080p', streamUrl: `${baseUrl}/${baseName}_1080p.m3u8`, format: 'hls', bitrate: 5000 },
    { resolution: '1440p', streamUrl: `${baseUrl}/${baseName}_1440p.m3u8`, format: 'hls', bitrate: 8000 },
    { resolution: '4K', streamUrl: `${baseUrl}/${baseName}_2160p.m3u8`, format: 'hls', bitrate: 15000 },
  ];

  for (const variant of variants) {
    await MediaVariant.create({ mediaId, ...variant });
    log.info(`Saved variant: ${variant.resolution}`);
  }

  media.mediaUrl = `${baseUrl}/${baseName}.m3u8`; // ✅ Master playlist
  media.transcodingStatus = 'completed';
  await media.save();

  return variants;
};



const abortUpload = async (userId, uploadId, key) => {
  const log = createRequestLogger({ userId });
  log.info(`Aborting multipart upload for uploadId: ${uploadId}, key: ${key}`);

  // Validate that the multipart upload exists and belongs to the user
  const listCommand = new ListMultipartUploadsCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Prefix: `uploads/${userId}/`,
  });
  const { Uploads } = await s3.send(listCommand);
  const uploadExists = Uploads?.some(upload => upload.UploadId === uploadId && upload.Key === key);
  if (!uploadExists) {
    throw new Error('Multipart upload not found or unauthorized');
  }

  const command = new AbortMultipartUploadCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    UploadId: uploadId,
  });

  await s3.send(command);
  log.info(`Multipart upload aborted for key: ${key}`);

  return { message: 'Multipart upload aborted successfully' };
};

const getMediaAccessUrl = async (userId, mediaId, variantResolution) => {
  const log = createRequestLogger({ userId });
  log.info(`Generating media access URL for mediaId: ${mediaId}, resolution: ${variantResolution || 'original'}`);

  const media = await Media.findById(mediaId);
  if (!media || (media.visibility !== 'public' && media.uploadedBy.toString() !== userId.toString())) {
    throw new Error('Media not found or unauthorized');
  }

  let s3Key;
  if (variantResolution) {
    const variant = await MediaVariant.findOne({ mediaId, resolution: variantResolution });
    if (!variant) {
      throw new Error('Media variant not found');
    }
    s3Key = variant.streamUrl.replace(`${process.env.AWS_S3_BUCKET_URL}/`, '');
  } else {
    s3Key = media.s3KeyOriginal;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
  });

  const accessUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  log.info(`Media access URL generated for s3://${process.env.AWS_S3_BUCKET}/${s3Key}`);

  return accessUrl;
};

const getAllMedia = async (userId, queryParams) => {
  const log = createRequestLogger({ userId });
  log.info('Fetching all media for user');

  const { visibility, type, genres } = queryParams;
  const query = { };

  if (visibility) query.visibility = visibility;
  if (type) query.type = type;
  if (genres) query.genres = { $in: genres.split(',') };

  return await Media.find(query).populate('uploadedBy', 'username email');
};

const getAllMediaVariant = async (mediaId) => {
  return await MediaVariant.find({ mediaId });
};


const getMediaById = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Fetching media by ID: ${mediaId}`);

  let media = await Media.findById(mediaId).populate('uploadedBy', 'username email');
  // if (!media || (media.visibility !== 'public' && media.uploadedBy.toString() !== userId.toString())) {
  //   throw new Error('Media not found or unauthorized');
  // }

  // Lazy transcoding check
  if (media.transcodingStatus === 'processing' && media.mediaConvertJobId) {
    const { Job } = await mediaConvert.send(new GetJobCommand({ Id: media.mediaConvertJobId }));
    console.log("MediaConvert Job Status:", Job.Status);
    
    if (Job.Status === 'COMPLETE') {
      if (!media.mediaUrl) {
        await saveMediaVariants(media._id); // Populate mediaUrl + variants
        media = await Media.findById(mediaId).populate('uploadedBy', 'username email');
      }
    } else if (Job.Status === 'ERROR') {
      media.transcodingStatus = 'failed';
      await media.save();
      throw new Error('Media transcoding failed. Please try again later.');
    } else {
      throw new Error('Media is still being processed. Please check back shortly.');
    }
  }

  // Fetch variants now that they should exist
  const variants = await MediaVariant.find({ mediaId: media._id });

  return { media, variants };
};



const updateMedia = async (userId, mediaId, updateData) => {
  const log = createRequestLogger({ userId });
  log.info(`Updating media: ${mediaId}`);

  const media = await Media.findById(mediaId);
  if (!media || media.uploadedBy.toString() !== userId.toString()) {
    throw new Error('Media not found or unauthorized');
  }

  Object.assign(media, updateData);
  await media.save();
  return media;
};

const deleteMedia = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Deleting media: ${mediaId}`);

  const media = await Media.findById(mediaId);
  if (!media || media.uploadedBy.toString() !== userId.toString()) {
    throw new Error('Media not found or unauthorized');
  }

  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: media.s3KeyOriginal,
  }));

  await MediaVariant.deleteMany({ mediaId });
  await media.deleteOne();

  return { message: 'Media deleted successfully' };
};


// const uploadThumbnail = async (userId, mediaId, thumbnailUrl) => {
//   const log = createRequestLogger({ userId });
//   log.info(`Uploading thumbnail for mediaId: ${mediaId}`);

//   const media = await Media.findById(mediaId);
//   if (!media || media.uploadedBy.toString() !== userId.toString()) {
//     throw new Error('Media not found or unauthorized');
//   }

//   media.thumbnailUrl = thumbnailUrl;
//   await media.save();

//   return media;
// };



const initiateThumbnailUpload = async (userId, mediaId, { filename, contentType }) => {
  const log = createRequestLogger({ userId });
  log.info(`Initiating thumbnail upload for mediaId: ${mediaId}, file: ${filename}`);

  const media = await Media.findById(mediaId);
  // if (!media || media.uploadedBy.toString() !== userId.toString()) {
  //   throw new Error('Media not found or unauthorized');
  // }

  const key = `thumbnails/${userId}/${mediaId}/${uuidv4()}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  log.info(`Presigned URL generated for thumbnail upload: ${key}`);

  return { presignedUrl, key };
};

const uploadThumbnail = async (userId, mediaId, key) => {
  const log = createRequestLogger({ userId });
  log.info(`Completing thumbnail upload for mediaId: ${mediaId}`);

  const media = await Media.findById(mediaId);
  // if (!media || media.uploadedBy.toString() !== userId.toString()) {
  //   throw new Error('Media not found or unauthorized');
  // }

  const thumbnailUrl = `${process.env.AWS_S3_BUCKET_URL}/${key}`;
  console.log(`Thumbnail URL: ${thumbnailUrl}`);
  console.log("BUCKET URL:", process.env.AWS_S3_BUCKET_URL);
  media.thumbnailUrl = thumbnailUrl;
  await media.save();

  log.info(`Thumbnail URL saved for mediaId: ${mediaId}`);
  return media;
};

export default {
  initiateUpload,
  getPresignedUrls,
  completeUpload,
  saveMediaVariants,
  abortUpload,
  getMediaAccessUrl,
  getAllMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  uploadThumbnail,
  getAllMediaVariant,
  initiateThumbnailUpload,
};