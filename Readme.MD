s3://your-bucket-name/
│
├── admin/                                             # Admin role
│   ├── profile.jpg                                    # Admin profile image
│
│   ├── uploads/                                       # Media uploaded by admin
│   │   ├── music/
│   │   │   └── YYYY/MM/DD/{media_id}/
│   │   │       ├── original.mp4                       # Original upload
│   │   │       ├── thumbnail.jpg                      # Thumbnail image
│   │   │       └── transcoded/                        # HLS output
│   │   │           └── hls/
│   │   │               ├── master.m3u8
│   │   │               ├── 360p/
│   │   │               │   ├── index.m3u8
│   │   │               │   ├── segment0.ts
│   │   │               │   └── ...
│   │   │               ├── 720p/
│   │   │               │   ├── index.m3u8
│   │   │               │   └── segment0.ts ...
│   │   │               └── ...
│   │   ├── movies/
│   │   │   └── YYYY/MM/DD/{media_id}/
│   │   │       ├── original.mp4
│   │   │       ├── thumbnail.jpg
│   │   │       └── transcoded/hls/...
│   │   └── podcast/
│   │       └── YYYY/MM/DD/{media_id}/
│   │           ├── original.mp3
│   │           ├── thumbnail.jpg
│   │           └── transcoded/hls/...
│
│   ├── playlists/
│   │   └── YYYY/MM/DD/{playlist_id}/
│   │       └── thumbnail.jpg                         # Playlist cover image
│
│   ├── radio/
│   │   └── YYYY/MM/DD/{station_id}/
│   │       └── thumbnail.jpg                         # Radio station artwork
│
│   └── products/                                     # 🛍️ Admin-only merchandise
│       └── YYYY/MM/DD/
│           └── {product_id}/
│               ├── main.jpg                          # Primary image for product
│               ├── thumbnail.jpg                     # Optimized thumbnail
│               ├── gallery/                          # Optional gallery images
│               │   ├── front.jpg
│               │   ├── side.jpg
│               │   └── closeup.jpg
│               └── metadata.json                     # Optional product metadata (or stored in DB)
│
├── artist/                                           # Artist role
│   └── {artist_id}/
│       ├── profile.jpg                               # Artist profile picture
│
│       ├── uploads/                                  # Artist media uploads
│       │   ├── music/
│       │   │   └── YYYY/MM/DD/{media_id}/
│       │   │       ├── original.mp4
│       │   │       ├── thumbnail.jpg
│       │   │       └── transcoded/hls/...
│       │   ├── movies/
│       │   │   └── YYYY/MM/DD/{media_id}/...
│       │   └── podcast/
│       │       └── YYYY/MM/DD/{media_id}/...
│
│       ├── playlists/
│       │   └── YYYY/MM/DD/{playlist_id}/
│       │       └── thumbnail.jpg
│
│       └── radio/
│           └── YYYY/MM/DD/{station_id}/
│               └── thumbnail.jpg
│
├── users/                                            # Regular users
│   └── {user_id}/
│       └── profile.jpg                               # User profile image
