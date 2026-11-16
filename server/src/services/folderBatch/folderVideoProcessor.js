import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export function inspectVideoFast(filePath, timeoutMs = 6000) {
  return new Promise((resolve) => {
    let resolved = false;
    let proc = null;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { if (proc) proc.kill(); } catch (e) {}
        resolve({ canSmartCopy: false, reason: 'probe_timeout', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
      }
    }, timeoutMs);

    try {
      proc = spawn('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,bit_rate,r_frame_rate,avg_frame_rate',
        '-show_entries', 'format=bit_rate,duration',
        '-of', 'json',
        filePath
      ]);

      let stdout = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', () => {
        if (resolved) return;
        clearTimeout(timer);
        resolved = true;

        try {
          const data = JSON.parse(stdout);
          const s = data.streams?.[0] || {};
          const fmt = data.format || {};
          const width = parseInt(s.width || 0, 10);
          const height = parseInt(s.height || 0, 10);
          const bitrate = parseInt(fmt.bit_rate || s.bit_rate || 0, 10);
          const duration = parseFloat(fmt.duration || 0);

          let fps = 0;
          const rateStr = s.avg_frame_rate || s.r_frame_rate || '';
          if (rateStr && rateStr.includes('/')) {
            const parts = rateStr.split('/');
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            if (den > 0) fps = Math.round(num / den);
          }

          const isAlreadyLowBitrate = bitrate > 0 && bitrate <= 850000;
          resolve({
            canSmartCopy: isAlreadyLowBitrate,
            reason: isAlreadyLowBitrate ? 'already_low_bitrate' : 'standard',
            width, height, bitrate, duration, fps
          });
        } catch (e) {
          resolve({ canSmartCopy: true, reason: 'probe_error', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
        }
      });

      proc.on('error', () => {
        if (resolved) return;
        clearTimeout(timer);
        resolved = true;
        resolve({ canSmartCopy: true, reason: 'probe_spawn_error', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
      });
    } catch (err) {
      if (!resolved) {
        clearTimeout(timer);
        resolved = true;
        resolve({ canSmartCopy: true, reason: 'probe_exception', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
      }
    }
  });
}

export async function processVideo(srcPath, destPath, settings, probeData = null, onProgress = null) {
  const origStat = await fs.promises.stat(srcPath);

  return new Promise((resolve, reject) => {
    const tempOut = `${destPath}.tmp_${Date.now()}.mp4`;

    let crf = 22;
    if (settings.videoPreset === 'quality') crf = 19;
    if (settings.videoPreset === 'speed') crf = 26;
    if (settings.videoCrf) crf = settings.videoCrf;

    const width = probeData?.width || 1920;
    const height = probeData?.height || 1080;
    const maxDim = Math.max(width, height);
    let maxrate = '4.5M';
    let bufsize = '9M';
    if (maxDim >= 3800) {
      maxrate = '8.5M';
      bufsize = '17M';
    } else if (maxDim <= 1280 && maxDim > 0) {
      maxrate = '2.5M';
      bufsize = '5M';
    }

    const qsvFullHardwareArgs = [
      '-y', '-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv', '-async_depth', '4',
      '-i', srcPath, '-c:v', 'h264_qsv', '-global_quality', String(crf),
      '-preset', 'veryfast', '-profile:v', 'high', '-maxrate', maxrate, '-bufsize', bufsize,
      '-c:a', 'copy', '-movflags', '+faststart', tempOut
    ];

    const qsvNativeArgs = [
      '-y', '-async_depth', '4', '-i', srcPath, '-c:v', 'h264_qsv',
      '-global_quality', String(crf), '-preset', 'veryfast', '-profile:v', 'high',
      '-maxrate', maxrate, '-bufsize', bufsize, '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart', tempOut
    ];

    const softArgs = [
      '-y', '-i', srcPath, '-c:v', 'libx264', '-crf', String(crf),
      '-preset', 'veryfast', '-profile:v', 'high', '-maxrate', maxrate,
      '-bufsize', bufsize, '-threads', '0', '-c:a', 'copy', '-movflags', '+faststart', tempOut
    ];

    const durationSec = probeData?.duration || 60;
    const timeoutLimitMs = Math.max(240000, durationSec * 3000);

    const runFfmpeg = (args, tier = 1) => {
      let timer = setTimeout(() => {
        try { proc.kill(); } catch (e) {}
      }, timeoutLimitMs);

      const proc = spawn('ffmpeg', args);
      let stderr = '';

      proc.stderr.on('data', (d) => {
        const str = d.toString();
        stderr += str;
        if (onProgress && probeData?.duration > 0) {
          const match = str.match(/time=(\d+):(\d+):(\d+\.\d+)/);
          if (match) {
            const curSec = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseFloat(match[3]);
            const pct = Math.min(99, Math.max(1, Math.round((curSec / probeData.duration) * 100)));
            onProgress(pct);
          }
        }
      });

      proc.on('close', async (code) => {
        clearTimeout(timer);
        if (code === 0 && fs.existsSync(tempOut)) {
          try {
            const outStat = await fs.promises.stat(tempOut);
            if (outStat.size >= origStat.size) {
              if (fs.existsSync(tempOut)) await fs.promises.unlink(tempOut).catch(() => {});
              if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
              await fs.promises.copyFile(srcPath, destPath);
              resolve({
                size: origStat.size,
                action: 'preserved_original',
                encoderUsed: tier === 3 ? 'libx264 Software' : 'Hardware Accelerated (QSV)',
                crf
              });
            } else {
              if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
              await fs.promises.rename(tempOut, destPath);
              resolve({
                size: outStat.size,
                action: 'compressed',
                encoderUsed: tier === 3 ? 'libx264 Software' : 'Hardware Accelerated (QSV)',
                crf
              });
            }
          } catch (err) {
            reject(err);
          }
        } else {
          if (fs.existsSync(tempOut)) await fs.promises.unlink(tempOut).catch(() => {});
          if (tier === 1) runFfmpeg(qsvNativeArgs, 2);
          else if (tier === 2) runFfmpeg(softArgs, 3);
          else reject(new Error(`FFmpeg encoding failed: ${stderr.slice(-200)}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (tier === 1) runFfmpeg(qsvNativeArgs, 2);
        else if (tier === 2) runFfmpeg(softArgs, 3);
        else reject(err);
      });
    };

    runFfmpeg(qsvFullHardwareArgs, 1);
  });
}
