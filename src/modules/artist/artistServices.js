const mongoose = require('mongoose');
const Artist = require('../../models/Artist');
const UserAuth = require('../../models/UserAuth');
const Media = require('../../models/Media');
const UserFollowArtist = require('../../models/UserFollowArtist');
const { createRequestLogger } = require('../../utils/requestLogger');

const getAllArtists = async (userId) => {
  const log = createRequestLogger({ userId });
  log.info('Fetching all artists for user');

  try {
    // Get IDs of artists followed by the user
    const followedArtists = await UserFollowArtist.find({ userId, isActive: true })
      .select('artistId')
      .lean();
    const followedArtistIds = followedArtists.map(f => f.artistId.toString());

    // Fetch all active artists
    const artists = await Artist.find({ isActive: true })
      .populate({
        path: 'media',
        match: { isActive: true, visibility: 'public' },
        select: 'title description type duration genres tags transcodingStatus',
      })
      .lean();

    // Calculate follower count for each artist and add isFollowed flag
    const artistsWithFollowers = await Promise.all(
      artists.map(async (artist) => {
        const followerCount = await UserFollowArtist.countDocuments({
          artistId: artist._id,
          isActive: true,
        });
        return {
          ...artist,
          followerCount,
          isFollowed: followedArtistIds.includes(artist._id.toString()),
        };
      })
    );

    // Sort artists: followed artists first, then others, both sorted by name
    const sortedArtists = artistsWithFollowers.sort((a, b) => {
      if (a.isFollowed && !b.isFollowed) return -1;
      if (!a.isFollowed && b.isFollowed) return 1;
      return a.name.localeCompare(b.name);
    });

    log.info(`Retrieved ${sortedArtists.length} artists`);
    return sortedArtists;
  } catch (error) {
    log.error(`Error fetching artists: ${error.message}`);
    throw error;
  }
};

const createArtist = async (userId, artistData) => {
  const log = createRequestLogger({ userId });
  log.info(`Creating artist with name: ${artistData.name}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await UserAuth.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already an artist
    if (user.role === 'artist') {
      throw new Error('User is already registered as an artist');
    }

    // Check for duplicate artist name
    const existingArtist = await Artist.findOne({ name: artistData.name }).session(session);
    if (existingArtist) {
      throw new Error('Artist name already exists');
    }

    // Create artist
    const artist = new Artist({
      name: artistData.name,
      bio: artistData.bio || '',
      profilePicture: artistData.profilePicture || '',
      socialLinks: artistData.socialLinks || {},
      genres: artistData.genres || [],
      isActive: true,
    });

    await artist.save({ session });

    // Update user role to artist
    user.role = 'artist';
    await user.save({ session });

    await session.commitTransaction();
    log.info(`Artist created and user role updated: ${artist.name}`);
    return artist;
  } catch (error) {
    await session.abortTransaction();
    log.error(`Error creating artist: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

const getArtistById = async (artistId, userId) => {
  const log = createRequestLogger({ userId: userId || 'anonymous', artistId });
  log.info(`Fetching artist with ID: ${artistId}`);

  try {
    const artist = await Artist.findById(artistId)
      .populate({
        path: 'media',
        match: { isActive: true, visibility: 'public' },
        select: 'title description type duration genres tags transcodingStatus mediaUrl thumbnailUrl',
      })
      .lean();

    if (!artist || !artist.isActive) {
      throw new Error('Artist not found');
    }

    // Get follower count
    const followerCount = await UserFollowArtist.countDocuments({
      artistId,
      isActive: true,
    });

    // Check if the user follows this artist
    let isFollowed = false;
    if (userId) {
      const followRecord = await UserFollowArtist.findOne({
        userId,
        artistId,
        isActive: true,
      });
      isFollowed = !!followRecord;
    }

    const artistWithDetails = {
      ...artist,
      followerCount,
      isFollowed,
    };

    log.info(`Artist fetched: ${artist.name}`);
    return artistWithDetails;
  } catch (error) {
    log.error(`Error fetching artist: ${error.message}`);
    throw error;
  }
};

const updateArtist = async (userId, artistId, updateData) => {
  const log = createRequestLogger({ userId });
  log.info(`Updating artist with ID: ${artistId}`);

  const artist = await Artist.findById(artistId);
  if (!artist || !artist.isActive) {
    throw new Error('Artist not found');
  }

  // Only allow the artist user or admin to update
  const user = await UserAuth.findById(userId);
  if (user.role !== 'admin' && user.role !== 'artist') {
    throw new Error('Unauthorized to update artist profile');
  }

  // Check for duplicate name if name is being updated
  if (updateData.name && updateData.name !== artist.name) {
    const existingArtist = await Artist.findOne({ name: updateData.name });
    if (existingArtist) {
      throw new Error('Artist name already exists');
    }
  }

  Object.assign(artist, {
    name: updateData.name || artist.name,
    bio: updateData.bio || artist.bio,
    profilePicture: updateData.profilePicture || artist.profilePicture,
    socialLinks: updateData.socialLinks || artist.socialLinks,
    genres: updateData.genres || artist.genres,
  });

  await artist.save();
  log.info(`Artist updated: ${artist.name}`);
  return artist;
};

const deleteArtist = async (userId, artistId) => {
  const log = createRequestLogger({ userId });
  log.info(`Deleting artist with ID: ${artistId}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const artist = await Artist.findById(artistId).session(session);
    if (!artist || !artist.isActive) {
      throw new Error('Artist not found');
    }

    // Only allow the artist user or admin to delete
    const user = await UserAuth.findById(userId).session(session);
    if (user.role !== 'admin' && user.role !== 'artist') {
      throw new Error('Unauthorized to delete artist profile');
    }

    // Soft delete artist
    artist.isActive = false;
    await artist.save({ session });

    // Update associated media to inactive
    await Media.updateMany(
      { uploadedBy: userId, uploaderType: 'artist' },
      { isActive: false },
      { session }
    );

    // Revert user role to 'user' if they are the artist
    if (user.role === 'artist') {
      user.role = 'user';
      await user.save({ session });
    }

    await session.commitTransaction();
    log.info(`Artist deleted: ${artistId}`);
    return { message: 'Artist deleted successfully' };
  } catch (error) {
    await session.abortTransaction();
    log.error(`Error deleting artist: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

const followArtist = async (userId, artistId) => {
  const log = createRequestLogger({ userId });
  log.info(`User ${userId} attempting to follow artist ${artistId}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if artist exists and is active
    const artist = await Artist.findById(artistId).session(session);
    if (!artist || !artist.isActive) {
      throw new Error('Artist not found');
    }

    // Check if user exists
    const user = await UserAuth.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if already following
    const existingFollow = await UserFollowArtist.findOne({
      userId,
      artistId,
      isActive: true,
    }).session(session);
    if (existingFollow) {
      throw new Error('You are already following this artist');
    }

    // Create follow record
    const followRecord = new UserFollowArtist({
      userId,
      artistId,
      followedAt: new Date(),
      isActive: true,
    });

    await followRecord.save({ session });

    await session.commitTransaction();
    log.info(`User ${userId} followed artist ${artistId}`);
    return { artistId, userId, followedAt: followRecord.followedAt };
  } catch (error) {
    await session.abortTransaction();
    log.error(`Error following artist: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

const unfollowArtist = async (userId, artistId) => {
  const log = createRequestLogger({ userId });
  log.info(`User ${userId} attempting to unfollow artist ${artistId}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if follow record exists
    const followRecord = await UserFollowArtist.findOneAndUpdate(
      { userId, artistId, isActive: true },
      { isActive: false },
      { new: true, session }
    );

    if (!followRecord) {
      throw new Error('You are not following this artist');
    }

    await session.commitTransaction();
    log.info(`User ${userId} unfollowed artist ${artistId}`);
    return { message: 'Unfollowed artist successfully' };
  } catch (error) {
    await session.abortTransaction();
    log.error(`Error unfollowing artist: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  getAllArtists,
  createArtist,
  getArtistById,
  updateArtist,
  deleteArtist,
  followArtist,
  unfollowArtist,
};