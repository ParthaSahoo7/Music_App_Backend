const { v4: uuidv4 } = require('uuid');
const {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  MediaConvertClient,
  CreateJobCommand,
} = require('@aws-sdk/client-mediaconvert');
const Media = require('../../models/Media');
const MediaVariant = require('../../models/MediaVariant');
const UserAuth = require('../../models/UserAuth');
const { createRequestLogger } = require('../../utils/requestLogger');

// Initialize S3 client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize MediaConvert client (v3)
const mediaConvert = new MediaConvertClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
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
  for (const partNumber of partNumbers) {
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

const completeUpload = async (userId, { uploadId, key, duration, title, description, type, visibility, genres, tags, language, ageRating, parts }) => {
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

  const completeCommand = new CompleteMultipartUploadCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3.send(completeCommand);

  // Fetch user to determine uploaderType
  const user = await UserAuth.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const uploaderType = user.role === 'admin' || user.role === 'artist' ? user.role : 'artist'; // Default to 'artist' for consistency

  // Save metadata to MongoDB
  const media = new Media({
    uploadedBy: userId,
    uploaderType,
    s3KeyOriginal: key,
    uploadId,
    title,
    description,
    type,
    visibility: visibility || 'public',
    genres: genres || [],
    tags: tags || [],
    language,
    ageRating,
    duration,
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
            SegmentDuration: 6,
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

const saveMediaVariants = async (mediaId, jobOutput) => {
  const log = createRequestLogger({ mediaId });
  log.info(`Saving media variants for mediaId: ${mediaId}`);

  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error('Media not found');
  }

  const variants = [
    {
      resolution: '240p',
      streamUrl: `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}/output_240p.m3u8`,
      format: 'hls',
      bitrate: 500,
    },
    {
      resolution: '480p',
      streamUrl: `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}/output_480p.m3u8`,
      format: 'hls',
      bitrate: 1000,
    },
    {
      resolution: '720p',
      streamUrl: `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}/output_720p.m3u8`,
      format: 'hls',
      bitrate: 2500,
    },
    {
      resolution: '1080p',
      streamUrl: `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}/output_1080p.m3u8`,
      format: 'hls',
      bitrate: 5000,
    },
    {
      resolution: '1440p',
      streamUrl: `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}/output_1440p.m3u8`,
      format: 'hls',
      bitrate: 8000,
    },
    {
      resolution: '4K',
      streamUrl: `${process.env.AWS_S3_BUCKET_URL}/transcoded/${mediaId}/output_2160p.m3u8`,
      format: 'hls',
      bitrate: 15000,
    },
  ];

  for (const variant of variants) {
    const mediaVariant = new MediaVariant({
      mediaId,
      ...variant,
    });
    await mediaVariant.save();
    log.info(`Saved variant: ${variant.resolution}`);
  }

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

const getMediaById = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Fetching media by ID: ${mediaId}`);

  const media = await Media.findById(mediaId).populate('uploadedBy', 'username email');
  if (!media || (media.visibility !== 'public' && media.uploadedBy.toString() !== userId.toString())) {
    throw new Error('Media not found or unauthorized');
  }
  return media;
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

module.exports = {
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
};