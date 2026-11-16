import { spawn } from 'child_process';
import fs from 'fs';
import { detectHardwareEncoder } from './gpuDetector.js';

export function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
    const probe = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    probe.stdout.on('data', (data) => { stdout += data.toString(); });
    probe.stderr.on('data', (data) => { stderr += data.toString(); });

    probe.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
      }

      try {
        const info = JSON.parse(stdout);
        const videoStream = info.streams?.find((s) => s.codec_type === 'video') || {};
        const audioStream = info.streams?.find((s) => s.codec_type === 'audio') || null;

        const duration = parseFloat(info.format?.duration || videoStream.duration || 0);
        const size = parseInt(info.format?.size || 0, 10);
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const codec = videoStream.codec_name || 'unknown';
        const bitrate = parseInt(info.format?.bit_rate || videoStream.bit_rate || 0, 10);

        let fps = 30;
        if (videoStream.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/');
          if (parts.length === 2 && parseInt(parts[1], 10) !== 0) {
            fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
          }
        }

        resolve({
          duration,
          size,
          sizeMB: parseFloat((size / (1024 * 1024)).toFixed(2)),
          width,
          height,
          codec,
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name || 'none',
          bitrateKbps: Math.round(bitrate / 1000),
          fps
        });
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
      }
    });
  });
}

export function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve) => {
    const args = [
      '-y', '-ss', '00:00:01', '-i', inputPath,
      '-vframes', '1', '-vf', "scale='min(720,iw)':-2",
      '-q:v', '3', outputPath
    ];
    const proc = spawn('ffmpeg', args);
    proc.on('close', (code) => {
      resolve(code === 0 && fs.existsSync(outputPath) ? outputPath : null);
    });
    proc.on('error', () => resolve(null));
  });
}

export async function createWebCompatibleOriginal(inputPath, outputPath) {
  const hw = await detectHardwareEncoder();
  return new Promise((resolve) => {
    const args = ['-y', '-i', inputPath];
    if (hw === 'h264_qsv') {
      args.push('-c:v', 'h264_qsv', '-global_quality', '18', '-c:a', 'copy', outputPath);
    } else {
      args.push('-c:v', 'libx264', '-crf', '18', '-preset', 'ultrafast', '-c:a', 'copy', outputPath);
    }
    const proc = spawn('ffmpeg', args);
    proc.on('close', (code) => {
      resolve(code === 0 && fs.existsSync(outputPath));
    });
    proc.on('error', () => resolve(false));
  });
}
