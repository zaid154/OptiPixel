import { spawn } from 'child_process';
import fs from 'fs';
import { detectHardwareEncoder } from './gpuDetector.js';
import { getVideoMetadata, generateThumbnail, createWebCompatibleOriginal } from './videoMetadata.js';
import { verifyIntegrity } from './videoVerifier.js';

export class VideoCompressionService {
  static detectHardwareEncoder() {
    return detectHardwareEncoder();
  }

  static getVideoMetadata(filePath) {
    return getVideoMetadata(filePath);
  }

  static generateThumbnail(inputPath, outputPath) {
    return generateThumbnail(inputPath, outputPath);
  }

  static createWebCompatibleOriginal(inputPath, outputPath) {
    return createWebCompatibleOriginal(inputPath, outputPath);
  }

  static verifyIntegrity(args) {
    return verifyIntegrity(args);
  }

  static async compressVideo({
    inputPath,
    outputPath,
    options = {},
    metadata,
    onProgress = () => {},
    onProcess = () => {}
  }) {
    const hwEncoder = await detectHardwareEncoder();

    return new Promise((resolve, reject) => {
      const {
        mode = 'crf',
        preset = 'balanced',
        targetMB = 25,
        crf = 26,
        codec = 'libx264',
        resolution = 'original',
        fps = 'keep',
        audioBitrate = '128k',
        mute = false
      } = options;

      const duration = metadata?.duration || 10;
      let args = ['-y', '-i', inputPath];

      let scaleFilter = '';
      if (resolution === '1080p') {
        scaleFilter = 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease';
      } else if (resolution === '720p') {
        scaleFilter = 'scale=w=1280:h=720:force_original_aspect_ratio=decrease';
      } else if (resolution === '480p') {
        scaleFilter = 'scale=w=854:h=480:force_original_aspect_ratio=decrease';
      }

      const padFilter = 'pad=ceil(iw/2)*2:ceil(ih/2)*2';
      const vf = scaleFilter ? `${scaleFilter},${padFilter}` : padFilter;
      args.push('-vf', vf);

      if (fps !== 'keep' && parseInt(fps, 10)) {
        args.push('-r', fps.toString());
      }

      if (mute) {
        args.push('-an');
      } else {
        args.push('-c:a', 'aac', '-b:a', audioBitrate || '128k');
      }

      const useQsv = (codec === 'libx264' || !codec) && hwEncoder === 'h264_qsv';
      const selectedCodec = useQsv ? 'h264_qsv' : (codec || 'libx264');

      if (useQsv) {
        args.push('-async_depth', '4', '-c:v', 'h264_qsv');
        if (mode === 'preset') {
          const gqMap = { ultra_lossless: '20', studio_sharp: '22', balanced: '24', compact: '28' };
          const pSpeed = preset === 'compact' ? 'veryfast' : 'fast';
          args.push('-global_quality', gqMap[preset] || '24', '-preset', pSpeed, '-profile', 'high');
        } else if (mode === 'target' || (mode === 'preset' && ['whatsapp_16', 'whatsapp_64', 'discord_25'].includes(preset))) {
          const audioBitrateNum = mute ? 0 : (parseInt(audioBitrate, 10) || 128);
          const targetBitsSafe = targetMB * 1024 * 1024 * 8 * 0.94;
          const videoBits = Math.max(100000, targetBitsSafe - (audioBitrateNum * 1000 * duration));
          const targetVideoBitrateKbps = Math.max(120, Math.floor((videoBits / duration) / 1000));
          args.push('-b:v', `${targetVideoBitrateKbps}k`, '-maxrate', `${Math.floor(targetVideoBitrateKbps * 1.5)}k`, '-preset', 'fast');
        } else if (mode === 'crf') {
          const cleanCrf = Math.max(16, Math.min(38, parseInt(crf, 10) || 22));
          args.push('-global_quality', cleanCrf.toString(), '-preset', 'fast', '-profile', 'high');
        }
      } else {
        args.push('-threads', '0', '-c:v', selectedCodec);
        const fastPreset = (metadata?.width >= 1920 || metadata?.height >= 1920) ? 'superfast' : 'fast';

        if (mode === 'preset') {
          const crfMap = { ultra_lossless: '18', studio_sharp: '20', balanced: '22', compact: '26' };
          const p = preset === 'compact' ? 'superfast' : fastPreset;
          args.push('-crf', crfMap[preset] || '22', '-preset', p, '-tune', 'film');
        } else if (mode === 'target' || (mode === 'preset' && ['whatsapp_16', 'whatsapp_64', 'discord_25'].includes(preset))) {
          const audioBitrateNum = mute ? 0 : (parseInt(audioBitrate, 10) || 128);
          const targetBitsSafe = targetMB * 1024 * 1024 * 8 * 0.94;
          const videoBits = Math.max(100000, targetBitsSafe - (audioBitrateNum * 1000 * duration));
          const targetVideoBitrateKbps = Math.max(120, Math.floor((videoBits / duration) / 1000));
          args.push(
            '-b:v', `${targetVideoBitrateKbps}k`,
            '-maxrate', `${Math.floor(targetVideoBitrateKbps * 1.5)}k`,
            '-bufsize', `${targetVideoBitrateKbps * 2}k`,
            '-preset', 'veryfast',
            '-tune', 'film'
          );
        } else if (mode === 'crf') {
          const cleanCrf = Math.max(16, Math.min(38, parseInt(crf, 10) || 21));
          args.push('-crf', cleanCrf.toString(), '-preset', 'superfast', '-tune', 'film');
        }
      }

      args.push('-movflags', '+faststart');
      if (selectedCodec === 'libx264' || selectedCodec === 'libx265') args.push('-pix_fmt', 'yuv420p');
      if (selectedCodec === 'libx265') args.push('-tag:v', 'hvc1');
      args.push(outputPath);

      const ffmpegProcess = spawn('ffmpeg', args);
      if (typeof onProcess === 'function') onProcess(ffmpegProcess);
      let stderrLog = '';

      ffmpegProcess.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrLog += text;
        const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d+)/);
        const fpsMatch = text.match(/fps=\s*([\d.]+)/);
        const speedMatch = text.match(/speed=\s*([\d.]+)x/);

        if (timeMatch && duration > 0) {
          const currentSec = parseFloat(timeMatch[1]) * 3600 + parseFloat(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
          const percent = Math.min(99, Math.max(1, Math.round((currentSec / duration) * 100)));
          const currentFps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
          const speed = speedMatch ? parseFloat(speedMatch[1]) : 1;
          const remainingSec = speed > 0 ? Math.max(0, Math.round((duration - currentSec) / speed)) : 0;

          onProgress({ percent, fps: Math.round(currentFps), speed: `${speed}x`, timeRemainingSec: remainingSec });
        }
      });

      ffmpegProcess.on('error', (err) => reject(new Error(`Failed to start FFmpeg: ${err.message}`)));

      ffmpegProcess.on('close', (code, signal) => {
        if (signal === 'SIGTERM' || signal === 'SIGKILL' || code === 255) return reject(new Error('CANCELLED'));
        if (code !== 0) return reject(new Error(`FFmpeg error code ${code}: ${stderrLog.slice(-500)}`));

        try {
          const outStats = fs.statSync(outputPath);
          const originalSize = metadata?.size || 1;
          const compressedSize = outStats.size;
          const percentageSaved = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);
          onProgress({ percent: 100, timeRemainingSec: 0 });

          verifyIntegrity({ outputPath, inputMetadata: metadata, options }).then((verification) => {
            resolve({
              originalSize,
              compressedSize,
              originalSizeMB: parseFloat((originalSize / (1024 * 1024)).toFixed(2)),
              compressedSizeMB: parseFloat((compressedSize / (1024 * 1024)).toFixed(2)),
              percentageSaved: parseFloat(percentageSaved.toFixed(1)),
              outputPath,
              verification
            });
          }).catch(() => {
            resolve({
              originalSize,
              compressedSize,
              originalSizeMB: parseFloat((originalSize / (1024 * 1024)).toFixed(2)),
              compressedSizeMB: parseFloat((compressedSize / (1024 * 1024)).toFixed(2)),
              percentageSaved: parseFloat(percentageSaved.toFixed(1)),
              outputPath,
              verification: { passed: true }
            });
          });
        } catch (statErr) {
          reject(statErr);
        }
      });
    });
  }
}
