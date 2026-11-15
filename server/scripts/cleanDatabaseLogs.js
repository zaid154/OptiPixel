import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing from .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to database:', mongoose.connection.name);

  const col = mongoose.connection.collection('optimizationlogs');
  const totalDocs = await col.countDocuments();
  console.log(`Total documents to inspect: ${totalDocs}`);

  // Step 1: Ensure originalSize and compressedSize exist
  console.log('Synchronizing originalSize and compressedSize...');
  await col.updateMany(
    { originalSize: { $exists: false }, originalBytes: { $exists: true } },
    [{ $set: { originalSize: '$originalBytes' } }]
  );
  await col.updateMany(
    { compressedSize: { $exists: false }, compressedBytes: { $exists: true } },
    [{ $set: { compressedSize: '$compressedBytes' } }]
  );

  // Step 2: Unset all bloated & redundant fields
  console.log('Removing bloated, redundant fields ($unset)...');
  const unsetResult = await col.updateMany(
    {},
    {
      $unset: {
        originalBytes: '',
        compressedBytes: '',
        originalSizeFormatted: '',
        compressedSizeFormatted: '',
        savedFormatted: '',
        timeTakenFormatted: '',
        qualityBefore: '',
        qualityAfter: '',
        dimensions: '',
        startTime: '',
        endTime: '',
        ipAddress: '',
        __v: ''
      }
    }
  );
  console.log(`Unset applied to ${unsetResult.modifiedCount} documents.`);

  // Step 3: Check sample document
  const sample = await col.findOne({});
  console.log('\n--- Cleaned Document Preview ---');
  console.log(JSON.stringify(sample, null, 2));
  console.log(`Remaining keys: ${Object.keys(sample).length}`);

  // Step 4: Ensure index on createdAt: -1
  await col.createIndex({ createdAt: -1 });
  console.log('Index on createdAt: -1 ensured.');

  await mongoose.disconnect();
  console.log('Database cleanup completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
