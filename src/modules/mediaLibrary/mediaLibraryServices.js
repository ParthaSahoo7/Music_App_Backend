import mongoose from 'mongoose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Playlist from '../../models/Playlist.js';
import WatchingHistory from '../../models/WatchingHistory.js';
import Favourite from '../../models/Favourite.js';
import WatchLater from '../../models/WatchLater.js';
import Download from '../../models/Download.js';
import Media from '../../models/Media.js';
import MediaVariant from '../../models/MediaVariant.js';
import { createRequestLogger } from '../../utils/requestLogger.js';
import UserProfile from '../../models/UserProfile.js';
import UserAuth from '../../models/UserAuth.js';

const createPlaylist = async (userId, { name, description, mediaItems, thumbnailUrl }) => {
  const log = createRequestLogger({ userId });
  log.info(`Creating playlist: ${name}`);

  if (mediaItems) {
    const mediaExists = await Media.find({ _id: { $in: mediaItems } });
    if (mediaExists.length !== mediaItems.length) {
      throw new Error('One or more media items not found');
    }
  }

  const user = await UserAuth.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  console.log("user", user.role);

  const playlist = new Playlist({
    name,
    createdBy: userId,
    creatorType: user.role,
    mediaItems: mediaItems || [],
    description,
    thumbnailUrl: thumbnailUrl || '',
    mediaItems: mediaItems || [],
  });

  await playlist.save();
  log.info(`Playlist created: ${playlist._id}`);
  return (await playlist.populate('mediaItems', 'title type thumbnailUrl')).populate('createdBy', 'username');
};

const getUserPlaylists = async (userId, queryParams, log) => {
  log.info('Fetching user playlists');

  const query = {
    isActive: true,
    $or: [
      { createdBy: userId },
      {
        creatorType: { $in: ['admin', 'artist'] },
        visibility: 'public'
      }
    ]
  };

  if (queryParams?.visibility) {
    query.visibility = queryParams.visibility;
  }

  const playlists = await Playlist.find(query)
    .populate('mediaItems', 'title type thumbnailUrl')
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 });

  return playlists;
};

const getPlaylistById = async (userId, playlistId, log) => {
  log.info(`Fetching playlist: ${playlistId}`);

  const playlist = await Playlist.findById(playlistId)
    .populate('mediaItems', 'title type thumbnailUrl')
    .populate('createdBy', 'username');

  if (!playlist) {
    throw new Error('Playlist not found');
  }

  const isOwner = playlist.createdBy._id.toString() === userId.toString();
  const isPublicFromAdminOrArtist = (
    ['admin', 'artist'].includes(playlist.creatorType) &&
    playlist.visibility === 'public'
  );

  if (!isOwner && !isPublicFromAdminOrArtist) {
    throw new Error('Unauthorized or playlist not found');
  }

  return playlist;
};

const updatePlaylist = async (userId, playlistId, updateData) => {
  const log = createRequestLogger({ userId });
  log.info(`Updating playlist: ${playlistId}`);

  const playlist = await Playlist.findById(playlistId);
  if (
    !playlist ||
    playlist.creatorType !== 'user' ||
    playlist.createdBy.toString() !== userId.toString()
  ) {
    throw new Error('Playlist not found or unauthorized');
  }


  Object.assign(playlist, updateData);
  await playlist.save();
  return playlist.populate('mediaItems', 'title type thumbnailUrl');
};

const addMediaToPlaylist = async (userId, playlistId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Adding media ${mediaId} to playlist ${playlistId}`);

  const playlist = await Playlist.findById(playlistId);

  if (
    !playlist ||
    playlist.creatorType !== 'user' ||
    playlist.createdBy.toString() !== userId.toString()
  ) {
    throw new Error('Playlist not found or unauthorized');
  }

  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error('Media not found');
  }

  if (!playlist.mediaItems.includes(mediaId)) {
    playlist.mediaItems.push(mediaId);
    await playlist.save();
  }

  return (await playlist.populate('mediaItems', 'title type thumbnailUrl')).populate('createdBy', 'username');
};

const removeMediaFromPlaylist = async (userId, playlistId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Removing media ${mediaId} from playlist ${playlistId}`);

  const playlist = await Playlist.findById(playlistId);

  if (
    !playlist ||
    playlist.creatorType !== 'user' ||
    playlist.createdBy.toString() !== userId.toString()
  ) {
    throw new Error('Playlist not found or unauthorized');
  }

  const index = playlist.mediaItems.findIndex(
    id => id.toString() === mediaId.toString()
  );

  if (index === -1) {
    throw new Error('Media not found in playlist');
  }

  playlist.mediaItems.splice(index, 1);
  await playlist.save();

  return playlist.populate('mediaItems', 'title type thumbnailUrl');
};

const deletePlaylist = async (userId, playlistId) => {
  const log = createRequestLogger({ userId });
  log.info(`Deleting playlist: ${playlistId}`);

  const playlist = await Playlist.findById(playlistId);

  if (
    !playlist ||
    playlist.creatorType !== 'user' ||
    playlist.createdBy.toString() !== userId.toString()
  ) {
    throw new Error('Playlist not found or unauthorized');
  }

  playlist.isActive = false;
  await playlist.save();
  log.info(`Playlist marked inactive (deleted): ${playlistId}`);
};

const updateWatchingHistory = async (userId, mediaId, { lastWatchedPosition, isCompleted }) => {
  const log = createRequestLogger({ userId });
  log.info(`Updating watching history for media: ${mediaId}`);

  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error('Media not found');
  }

  const history = await WatchingHistory.findOneAndUpdate(
    { userId, mediaId },
    {
      lastWatchedPosition,
      isCompleted: isCompleted || false,
      lastWatchedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  if (isCompleted) {
    await Media.findByIdAndUpdate(mediaId, { $inc: { views: 1 } });
  }

  return history.populate('mediaId', 'title type thumbnailUrl');
};

const getWatchingHistory = async (userId) => {
  const log = createRequestLogger({ userId });
  log.info('Fetching watching history');

  const history = await WatchingHistory.find({ userId })
    .populate('mediaId', 'title type thumbnailUrl duration')
    .sort({ lastWatchedAt: -1 });

  return history;
};

const addToFavourites = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Adding media ${mediaId} to favourites`);

  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error('Media not found');
  }

  const favourite = await Favourite.findOneAndUpdate(
    { userId, mediaId },
    { userId, mediaId },
    { upsert: true, new: true }
  );

  return favourite.populate('mediaId', 'title type thumbnailUrl');
};

const removeFromFavourites = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Removing media ${mediaId} from favourites`);

  const favourite = await Favourite.findOneAndDelete({ userId, mediaId });
  if (!favourite) {
    throw new Error('Favourite not found');
  }

  log.info(`Media ${mediaId} removed from favourites`);
};

const getFavourites = async (userId) => {
  const log = createRequestLogger({ userId });
  log.info('Fetching favourites');

  const favourites = await Favourite.find({ userId })
    .populate('mediaId', 'title type thumbnailUrl')
    .sort({ createdAt: -1 });

  return favourites;
};

const addToWatchLater = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Adding media ${mediaId} to watch later`);

  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error('Media not found');
  }

  const watchLater = await WatchLater.findOneAndUpdate(
    { userId, mediaId },
    { userId, mediaId },
    { upsert: true, new: true }
  );

  return watchLater.populate('mediaId', 'title type thumbnailUrl');
};

const removeFromWatchLater = async (userId, mediaId) => {
  const log = createRequestLogger({ userId });
  log.info(`Removing media ${mediaId} from watch later`);

  const watchLater = await WatchLater.findOneAndDelete({ userId, mediaId });
  if (!watchLater) {
    throw new Error('Watch later entry not found');
  }

  log.info(`Media ${mediaId} removed from watch later`);
};

const getWatchLater = async (userId) => {
  const log = createRequestLogger({ userId });
  log.info('Fetching watch later list');

  const watchLater = await WatchLater.find({ userId })
    .populate('mediaId', 'title type thumbnailUrl')
    .sort({ createdAt: -1 });

  return watchLater;
};

const initiateDownload = async (userId, { mediaId, mediaVariantId, resolution, fileSize }) => {
  const log = createRequestLogger({ userId });
  log.info(`Initiating download for media ${mediaId}, variant ${mediaVariantId}`);

  const media = await Media.findById(mediaId);
  if (!media) {
    throw new Error('Media not found');
  }

  const variant = await MediaVariant.findById(mediaVariantId);
  if (!variant || variant.mediaId.toString() !== mediaId.toString() || variant.resolution !== resolution) {
    throw new Error('Invalid media variant');
  }

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
  });

  const s3Key = variant.streamUrl.replace(`${process.env.AWS_S3_BUCKET_URL}/`, '');
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 7 * 24 * 60 * 60 });

  const download = new Download({
    userId,
    mediaId,
    mediaVariantId,
    resolution,
    downloadUrl,
    fileSize,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await download.save();
  log.info(`Download initiated: ${download._id}`);
  return download.populate('mediaId', 'title type thumbnailUrl');
};

const getDownloads = async (userId) => {
  const log = createRequestLogger({ userId });
  log.info('Fetching downloads');

  const downloads = await Download.find({ userId, isActive: true })
    .populate('mediaId', 'title type thumbnailUrl')
    .populate('mediaVariantId', 'resolution streamUrl')
    .sort({ createdAt: -1 });

  return downloads;
};

const deleteDownload = async (userId, downloadId) => {
  const log = createRequestLogger({ userId });
  log.info(`Deleting download: ${downloadId}`);

  const download = await Download.findById(downloadId);
  if (!download || download.userId.toString() !== userId.toString()) {
    throw new Error('Download not found or unauthorized');
  }

  download.isActive = false;
  await download.save();
  log.info(`Download deleted: ${downloadId}`);
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