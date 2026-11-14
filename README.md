# ⚡ OptiPixel — High-Performance Media Optimization Suite

OptiPixel is an enterprise-grade full-stack media optimization platform built with **MERN Stack** (MongoDB, Express, React, Node.js), **Sharp (libvips)**, and **FFmpeg (Intel Iris Xe QuickSync GPU Hardware Acceleration)**.

Designed for high-fidelity photo and video compression with **zero visible quality loss**, synchronized inspection, and native support for recursive batch processing of **11,000+ files**.

---

## 🌟 Key Features

### 1. 📁 Recursive Local Folder Batch Optimizer (11,000+ Files Support)
- **Direct Local NVMe/SSD Engine:** Reads directly from local directories and streams directly to destination folders—zero browser memory crashes and zero HTTP upload bottlenecks.
- **Identical Directory Mirroring:** Recursively traverses sub-folders and sub-sub-folders to any depth, replicating the exact folder structure in the output folder.
- **🛡️ Smart Quality Guard (Need-Based Optimization):** Automatically protects lightweight photos (e.g. $\le$ 500 KB) and videos from unnecessary re-compression, preventing generation loss and keeping 100% camera clarity.
- **100% Zero-Deletion Guarantee:** Source folder is strictly **Read-Only**; original files are never altered or deleted.
- **Fault-Tolerant & 1-Click Retry / Fallback:** Corrupted files are auto-skipped so batches never stall, with 1-click **"Retry Compression"** and emergency **"Copy Real Files As-Is"** to guarantee 100% complete files.
- **Real-Time Live SSE Stream:** Live progress bar, dynamic time remaining (ETA), throughput speed (`items/s`), and live storage saved counters (GBs).

### 2. 🎬 Synchronized Dual Video Inspection (Intel Iris Xe QSV)
- **Side-by-Side Synchronized Playback:** Original vs Optimized 4K/1080p videos play, pause, and seek in lockstep with Adaptive Micro-Rate Correction.
- **Interactive Split Slider View:** Draggable vertical divider to inspect fine video textures frame-by-frame.
- **GPU Hardware Accelerated Encoding:** Powered by Intel QuickSync (`h264_qsv`) for up to 15x–20x faster encoding.
- **Stream Integrity Verification:** Automated bitstream validation (0 decode errors), audio track preservation (AAC stereo), and resolution consistency.

### 3. 🖼️ Single Image Studio & Comparison Slider
- **Before/After Split Slider:** Seamless draggable comparison with 1x, 2x, 3x inspection zoom.
- **Smart Target Mode:** Binary search pass hitting exact file sizes (e.g., `< 200 KB`, `< 500 KB`).
- **Multi-Format Output:** WebP, MozJPEG (progressive, trellis quantisation), AVIF, and palette-quantized PNG.
- **Enhancement Studio:** Denoise, Lanczos3 2x super-resolution upscaling, dynamic tone mapping, and edge sharpening.

### 4. 📦 Batch ZIP Downloader
- Drag and drop 10–50 photos in-browser for instant parallel compression and single-click `.zip` bundle download.

---

## 📁 Project Structure

```
OptiPixel/
├── server/
│   ├── routes/
│   │   ├── compressRoutes.js      # Single & Target Image endpoints
│   │   ├── videoRoutes.js         # Video upload, QSV compression & stream endpoints
│   │   ├── folderBatchRoutes.js   # Local recursive folder scan, start, SSE progress & retry
│   │   └── statsRoutes.js         # MongoDB stats & telemetry
│   ├── services/
│   │   ├── compressionService.js  # Sharp libvips image engine
│   │   ├── videoCompressionService.js # FFmpeg Intel QSV video engine
│   │   └── folderBatchService.js  # Asynchronous recursive disk batch worker
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express server
│
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx                    # Navigation header with Folder Batch 11k+ tab
    │   │   ├── DropZone.jsx                  # Drag-and-drop image uploader
    │   │   ├── ImageComparisonSlider.jsx     # Before/After draggable split slider
    │   │   ├── ControlPanel.jsx              # Image controls & enhancement studio
    │   │   ├── VideoDropZone.jsx             # Video drag-and-drop zone
    │   │   ├── VideoPlayerComparison.jsx     # Synchronized dual player & split slider
    │   │   ├── VideoControlPanel.jsx         # Video presets, scrubbing & integrity checklist
    │   │   ├── LocalFolderBatchOptimizer.jsx # 11k+ recursive folder batch UI
    │   │   └── StatsBanner.jsx               # Telemetry footer
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) (with QuickSync or software x264)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URI)

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env # Set your PORT and MONGO_URI
npm start
# Server runs on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:3000
```

---

## 📄 License
MIT License. Created by [Zaid](https://github.com/zaid154).
