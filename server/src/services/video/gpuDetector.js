import { spawn } from 'child_process';

let hardwareEncoderCache = undefined;

/**
 * Auto-detect available GPU Hardware Acceleration (QSV, NVENC)
 */
export async function detectHardwareEncoder() {
  if (hardwareEncoderCache !== undefined) return hardwareEncoderCache;

  try {
    const isQsvSupported = await new Promise((resolve) => {
      const p = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'nullsrc=s=64x64:d=0.1', '-c:v', 'h264_qsv', '-f', 'null', '-']);
      p.on('close', (code) => resolve(code === 0));
      p.on('error', () => resolve(false));
    });

    if (isQsvSupported) {
      hardwareEncoderCache = 'h264_qsv';
      console.log('Hardware Acceleration: QuickSync (h264_qsv) ENABLED');
      return 'h264_qsv';
    }
  } catch (e) {}

  hardwareEncoderCache = null;
  return null;
}
