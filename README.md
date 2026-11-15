# OptiPixel

OptiPixel is a local-first media compression, recursive batch processing, and visual duplicate detection system for photos and videos. It runs locally against your drives using Node.js, Sharp (libvips), and FFmpeg with Intel QuickSync (QSV) hardware acceleration.

---

## What OptiPixel Does

When managing large media libraries (e.g. phone backups, event photography, WhatsApp archives), you often run into two problems:
1. **Bloated Storage:** Thousands of large photos and videos that can be reduced by 40%–70% with no perceptible drop in quality.
2. **Duplicate Clutter:** Exact duplicates, resized/compressed copies (e.g., from WhatsApp or social media), and slightly cropped shots taking up gigabytes across nested folders.

OptiPixel runs directly on your machine without uploading files to third-party cloud services.

---

## Core Capabilities

### 1. Duplicate Finder & Organizer
- **3-Tier Matching Engine:**
  - **Exact Hash:** SHA-256 hashing for identical files.
  - **1:1 Raw Pixel:** Format- and EXIF-agnostic raw pixel bitmap comparison.
  - **Visual Perceptual:** dHash and pHash with a 256-entry lookup table for bitwise Hamming distance calculation.
- **Video Duplicate Detection:** Multi-timestamp keyframe hashing, duration filtering, and aspect ratio validation.
- **Content Fidelity Safeguard:** Distinguishes near-identical UI screenshots (e.g. login screens with different usernames) using edge variance and brightness checks.
- **Synchronized Inspector:** Side-by-side synchronized video/image inspection with linked zoom/pan, 1-click rotation, frame-by-frame steppers, and an A/B audio toggle to listen to both tracks in real time.
- **Safe Actions:**
  - Move to `_Duplicates_Quarantine/` folder with 1-click undo / restoration.
  - Move to system Recycle Bin / Trash.
  - Permanent deletion with confirmation.
- **Instant In-Memory Re-clustering:** Changing the similarity threshold (85%–100%) re-clusters pre-buffered hashes in memory in ~150ms without re-reading disks.
- **Full State Persistence:** Folder paths, slider thresholds, match modes, and Keep/Delete selections survive browser refreshes and tab switching.

### 2. Recursive Local Folder Batch Optimizer
- **Direct Disk Streaming:** Reads from local NVMe/SSD and writes directly to an output folder. Tested on folders with 11,000+ files without browser memory limits.
- **Nested Directory Mirroring:** Recursively traverses sub-folders to any depth and mirrors the exact folder structure in the destination.
- **Need-Based Quality Guard:** Automatically skips already lightweight files (e.g. photos under 500 KB or videos under 15 MB) to avoid generation loss.
- **Fault-Tolerant Worker:** Automatically skips corrupted or locked files to keep the queue running. Includes 1-click "Retry Compression" and "Copy Originals As-Is" fallback so no files are missed.
- **Real-Time Telemetry:** Live SSE stream with progress percentage, remaining time estimate, throughput speed, and saved disk space.

### 3. Synchronized Video Optimizer
- **Intel Iris Xe Hardware Acceleration:** Uses FFmpeg Intel QuickSync (`h264_qsv`) for high-speed encoding, with fallback to software encoding (`libx264`).
- **Synchronized A/B Player:** Master vs Optimized video playback with micro-rate drift correction and 2 MB range streaming for smooth playback.
- **Integrity Validation:** Automated stream checks for decode errors, audio track preservation, and dimension consistency.

### 4. Single Image Studio & Batch ZIP
- **Comparison Slider:** Before/After split slider with 1x, 2x, 3x inspection zoom.
- **Format Support:** WebP, MozJPEG (progressive, trellis quantization), AVIF, and palette-quantized PNG.
- **Target Size Mode:** Binary search compression targeting specific file sizes (e.g. `< 200 KB`).
- **In-Browser Batch:** Quick drag-and-drop for 10–50 photos with instant `.zip` export.

---

## Architecture & Tech Stack

```
OptiPixel/
├── client/                      # React 18 frontend (Vite, Tailwind CSS, Lucide Icons)
│   ├── src/
│   │   ├── components/
│   │   │   ├── duplicateFinder/ # Duplicate feed, cards, inspector modal, tray & controls
│   │   │   ├── folderBatch/     # Recursive batch steps, config, progress & modal
│   │   │   ├── history/         # History drawer & local storage persistence
│   │   │   └── Navbar.jsx       # App-wide navigation
│   │   └── App.jsx              # Routing & session restoration
│   └── vite.config.js
│
└── server/                      # Node.js Express backend
    ├── controllers/
    │   └── mediaStreamController.js # 2MB range streaming & thumbnail generation
    ├── routes/
    │   ├── duplicateRoutes.js   # Scan, groups, recluster, actions, restore
    │   ├── folderBatchRoutes.js # Disk browse, scan, batch start, SSE progress, retry
    │   ├── compressRoutes.js    # Single image & batch zip endpoints
    │   └── videoRoutes.js       # Video upload, transcode & stream endpoints
    ├── services/
    │   ├── duplicate/           # Clustering, hashing, raw pixel & video keyframe services
    │   ├── folderBatchService.js# Recursive directory batch worker
    │   └── compressionService.js# Sharp libvips image engine
    └── server.js                # Express & Socket.io server
```

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Socket.io-client.
- **Backend:** Node.js, Express, Socket.io, Server-Sent Events (SSE).
- **Processing Engines:** Sharp (libvips), FFmpeg (`h264_qsv`, `ffprobe`).
- **Storage & Caching:** MongoDB (Mongoose), LRU memory cache, disk session cache (`.optipixel_cache/`).

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **FFmpeg** installed and accessible in your system `PATH`
- **MongoDB** (Local instance or MongoDB Atlas connection string)

### 1. Server Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/optipixel
CLIENT_URL=http://localhost:3000
```

Start the server:

```bash
npm run dev
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
