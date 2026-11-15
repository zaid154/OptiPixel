import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

function formatTimeDuration(ms) {
  if (ms === undefined || ms === null || ms <= 0) return '0ms';
  if (ms < 10) return `${parseFloat(Number(ms).toFixed(2))}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${parseFloat(sec.toFixed(1))}s`;
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

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('optimizationlogs');

  const cursor = col.find({});
  let count = 0;
  const bulkOps = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    let ms = doc.timeTakenMs;
    if (ms === undefined || ms === null) {
      if (typeof doc.timeTaken === 'string') {
        if (doc.timeTaken.endsWith('ms')) {
          ms = parseFloat(doc.timeTaken);
        } else if (doc.timeTaken.endsWith('s') && !doc.timeTaken.includes('m')) {
          ms = Math.round(parseFloat(doc.timeTaken) * 1000);
        } else if (doc.timeTaken.includes('m')) {
          const parts = doc.timeTaken.split('m');
          const m = parseInt(parts[0], 10) || 0;
          const s = parseInt(parts[1], 10) || 0;
          ms = (m * 60 + s) * 1000;
        }
      }
    }
    if (ms === undefined || ms === null || ms <= 0) {
      ms = 10; // Default small duration fallback
    }

    const formattedTime = formatTimeDuration(ms);

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            timeTaken: formattedTime,
            rawTimeTakenMs: ms
          },
          $unset: {
            timeTakenMs: ''
          }
        }
      }
    });

    if (bulkOps.length >= 1000) {
      await col.bulkWrite(bulkOps, { ordered: false });
      count += bulkOps.length;
      console.log(`Updated time formatting for ${count} documents...`);
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await col.bulkWrite(bulkOps, { ordered: false });
    count += bulkOps.length;
  }

  console.log(`Completed time formatting for all ${count} documents!`);

  const samples = await col.find({}).limit(5).toArray();
  console.log('\n--- Sample Documents in Compass ---');
  for (const s of samples) {
    console.log(`- ${s.originalName}: size=${s.originalSize}, saved=${s.bytesSaved}, time=${s.timeTaken}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
