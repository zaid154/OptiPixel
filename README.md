# OptiPixel

OptiPixel is a local-first media compression, recursive batch processing, and visual duplicate detection system for photos and videos. It runs locally against your drives using Node.js, Sharp (libvips), and FFmpeg with Intel QuickSync (QSV) hardware acceleration.

---

## What OptiPixel Does

When managing large media libraries (e.g., camera backups, wedding archives, phone backups, WhatsApp folders), you often face two major challenges:
1. **Bloated Storage:** Thousands of large photos and 4K videos that can be reduced by 40%–60% with zero perceptible drop in picture quality.
2. **Duplicate Clutter:** Exact duplicates, resized/compressed copies (from WhatsApp or social media), and slightly cropped shots taking up tens of gigabytes across nested folders.

OptiPixel runs 100% on your machine—no cloud uploads, zero privacy risk, and maximum NVMe/SSD throughput.

---

## Core Capabilities

### 1. Ultra Max Quality Video Engine (Intel QSV HEVC & H.264)
- **True Perceptual Quality (CRF Mode):** Pure visual fidelity optimization without artificial bitrate ceilings, maintaining high-frequency detail (textiles, faces, wedding jewelry, low-light textures).
- **Intel QuickSync Hardware Acceleration:** Hardware encoding via `hevc_qsv` (H.265) and `h264_qsv` with Lookahead Rate-Distortion Optimization (`-look_ahead 1 -look_ahead_depth 40`).
- **Verified SSIM 0.98 Fidelity:** 4K 60fps video re-encoded at CRF 18–20 achieves an SSIM of **0.9793 (~0.98)** vs original camera sensor footage, saving **56% disk space** with zero visible compression artifacts.
- **System Resource Guard & Concurrency Control:**
  - Strict video worker concurrency (`concurrency = 1`) to eliminate thermal throttling and GPU driver lockups.
  - CPU thread capping (`-threads 2`) keeps the machine responsive (< 30% CPU load).
  - Standby Guard on server boot: restored batches enter `PAUSED` standby to prevent unwanted CPU/RAM usage on app launch.
- **Smart Quality Guard:** Automatically preserves originals if re-encoding would inflate the file size or if input media is already compressed at optimal bitrates.

### 2. Recursive Local Folder Batch Optimizer
- **Direct Disk Streaming:** Processes directly from local NVMe/SSD to output folders. Tested on large collections (10,000+ files) without browser memory limits.
- **Mirror Folder Structure:** Recursively traverses sub-folders to any depth and mirrors the exact directory layout in the destination.
- **Dual Path File Audit & MongoDB Atlas Logs:**
  - Every processed file records full absolute source paths (`sourcePath`) and destination paths (`destinationPath`).
  - Interactive drilldown table shows exact `From: D:\...` and `Saved: D:\...` paths for complete auditing.
- **Real-Time Live Telemetry:** SSE-driven progress bar with percentage, remaining ETA, throughput speed (items/sec), and breakdown counter (`Photos: 596 / 596`, `Videos: 31 / 40`, `Docs: 8 / 8`).
- **Resilient Fallback Engine:** Automatic 3-tier fallback (QSV Hardware -> QSV Audio Transcode -> CPU Software -> Pristine Original Copy) ensuring zero missing files.

### 3. Duplicate Finder & Organizer
- **3-Tier Matching Engine:**
  - **Exact Hash:** SHA-256 hashing for bit-for-bit identical files.
  - **1:1 Raw Pixel:** Format- and EXIF-agnostic raw pixel bitmap comparison.
  - **Visual Perceptual:** dHash and pHash with a 256-entry lookup table for bitwise Hamming distance calculation.
- **Video Duplicate Detection:** Multi-timestamp keyframe hashing, duration filtering, and aspect ratio validation.
- **Synchronized Inspector:** Side-by-side synchronized video/image inspection with linked zoom/pan, 1-click rotation, frame-by-frame steppers, and an A/B audio toggle.
- **Safe Actions:**
  - Move to `_Duplicates_Quarantine/` folder with 1-click undo / restoration.
  - Move to system Recycle Bin / Trash.
  - Permanent deletion with confirmation dialog.
- **Instant In-Memory Re-clustering:** Dynamic threshold adjustments (85%–100%) re-cluster in ~150ms without re-reading disks.

### 4. Single Image Studio & Batch ZIP
- **Comparison Slider:** Before/After split slider with 1x, 2x, 3x inspection zoom.
- **Format Support:** WebP, MozJPEG (progressive, trellis quantization), AVIF, and palette-quantized PNG.
- **Target Size Mode:** Binary search compression targeting specific file sizes (e.g. `< 200 KB`).
- **In-Browser Batch:** Quick drag-and-drop for photos with instant `.zip` download.

---

## Architecture & Directory Structure

```
OptiPixel/
├── client/                      # React 18 Frontend (Vite, Tailwind CSS, Lucide Icons)
│   ├── src/
│   │   ├── components/
│   │   │   ├── duplicateFinder/ # Duplicate feed, cards, inspector modal, tray & controls
│   │   │   ├── folderBatch/     # Recursive batch steps, config, progress & summary
│   │   │   ├── history/         # History drawer, audit drilldown table & modal
│   │   │   └── Navbar.jsx       # App navigation
│   │   └── App.jsx              # Main routing & state restoration
│   └── vite.config.js
│
└── server/                      # Node.js Express Backend
    ├── config/                  # Database & environment configurations
    ├── controllers/             # Batch, duplicate, compress & video controllers
    ├── middleware/              # Error handling & logging middleware
    ├── models/                  # Mongoose models (OptimizationLog, DeletionLog, FileCache)
    ├── routes/                  # Express REST routes
    ├── services/                # Business logic
    │   ├── duplicate/           # Clustering, perceptual hashing & keyframe services
    │   ├── folderBatch/         # Scheduler, worker, state, video & image processors
    │   ├── compressionService.js# Sharp libvips image engine
    │   └── historyService.js    # Batch history records & disk path audit persistence
    └── index.js                 # HTTP & Socket.io server entry point
```

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io, Server-Sent Events (SSE).
- **Processing Engines:** Sharp (libvips), FFmpeg (`hevc_qsv`, `h264_qsv`, `ffprobe`).
- **Database & Persistence:** MongoDB Atlas (Mongoose), disk session cache (`.optipixel_cache/`).

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **FFmpeg** (v5.0+ with QSV support recommended) accessible in system `PATH`
- **MongoDB** (Local instance or MongoDB Atlas connection string)

### 1. Server Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/optipixel
CLIENT_URL=http://localhost:3000
```

Start the server:

```bash
npm start
# Server runs on http://localhost:5000
```

### 2. Client Setup

```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:3000
```

---

## Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/optipixel` |
| `CLIENT_URL` | Allowed CORS origin for frontend | `http://localhost:3000` |

---

## License

MIT License. Developed by [Zaid](https://github.com/zaid154).
