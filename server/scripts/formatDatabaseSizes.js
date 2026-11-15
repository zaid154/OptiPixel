import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0s';
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('optimizationlogs');

  const cursor = col.find({});
  let count = 0;
  const bulkOps = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const origNum = typeof doc.originalSize === 'number' ? doc.originalSize : (doc.rawOriginalBytes || 0);
    const compNum = typeof doc.compressedSize === 'number' ? doc.compressedSize : (doc.rawCompressedBytes || 0);
    const savedNum = typeof doc.bytesSaved === 'number' ? doc.bytesSaved : (doc.rawBytesSaved || 0);
    const pctNum = typeof doc.percentageSaved === 'number' ? doc.percentageSaved : parseFloat(doc.percentageSaved || 0);
    const timeMs = doc.timeTakenMs || 0;

    const updateDoc = {
      $set: {
        originalSize: formatBytes(origNum),
        compressedSize: formatBytes(compNum),
        bytesSaved: formatBytes(savedNum),
        percentageSaved: `${pctNum.toFixed(1)}%`,
        timeTaken: formatDurationMs(timeMs),
        rawOriginalBytes: origNum,
        rawCompressedBytes: compNum,
        rawBytesSaved: savedNum,
        rawPercentSaved: pctNum
      },
      $unset: {
        timeTakenMs: ''
      }
    };

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: updateDoc
      }
    });

    if (bulkOps.length >= 1000) {
      await col.bulkWrite(bulkOps, { ordered: false });
      count += bulkOps.length;
      console.log(`Updated ${count} documents...`);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await col.bulkWrite(bulkOps, { ordered: false });
    count += bulkOps.length;
  }

  console.log(`Finished converting all ${count} documents to human-readable units!`);

  // Preview sample document
  const sample = await col.findOne({});
  console.log('\n--- Updated Document in Compass ---');
  console.log(JSON.stringify(sample, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
