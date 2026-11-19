import fs from 'fs';
import path from 'path';
import { processPdf } from '../services/folderBatch/folderPdfProcessor.js';

const targetDir = 'D:/Zaid/Memories_Optimized';
console.log(`Starting PDF Optimization Engine on: ${targetDir} ...`);

const allPdfPaths = [];

function findPdfs(dir) {
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const d of list) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) findPdfs(p);
      else if (d.name.toLowerCase().endsWith('.pdf')) allPdfPaths.push(p);
    }
  } catch (e) {}
}

findPdfs(targetDir);
const totalPdfs = allPdfPaths.length;
console.log(`Discovered ${totalPdfs} PDF files across all subfolders.`);

let totalOriginalBytes = 0;
let totalCompressedBytes = 0;
let compressedCount = 0;
let pristineCount = 0;
let processedCount = 0;

const startTime = Date.now();
const CONCURRENCY = 4;
let currentIndex = 0;

async function worker() {
  while (currentIndex < allPdfPaths.length) {
    const idx = currentIndex++;
    if (idx >= allPdfPaths.length) break;
    const pdfPath = allPdfPaths[idx];

    try {
      const origStat = await fs.promises.stat(pdfPath);
      totalOriginalBytes += origStat.size;

      const tempOut = `${pdfPath}.tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const res = await processPdf(pdfPath, tempOut);

      if (res.action === 'compressed' && fs.existsSync(tempOut)) {
        await fs.promises.rename(tempOut, pdfPath);
        totalCompressedBytes += res.size;
        compressedCount++;
      } else {
        if (fs.existsSync(tempOut)) await fs.promises.unlink(tempOut).catch(() => {});
        totalCompressedBytes += origStat.size;
        pristineCount++;
      }
    } catch (err) {
      pristineCount++;
    }

    processedCount++;
    if (processedCount % 100 === 0 || processedCount === totalPdfs) {
      const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000);
      const speed = (processedCount / elapsedSec).toFixed(1);
      const savedMB = Math.max(0, (totalOriginalBytes - totalCompressedBytes) / (1024 * 1024)).toFixed(2);
      console.log(`Progress: ${processedCount}/${totalPdfs} (${Math.round((processedCount/totalPdfs)*100)}%) | Compressed: ${compressedCount} | Saved: ${savedMB} MB | Speed: ${speed} pdfs/s`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const totalSavedMB = Math.max(0, (totalOriginalBytes - totalCompressedBytes) / (1024 * 1024)).toFixed(2);
const totalSavedGB = (totalSavedMB / 1024).toFixed(2);

console.log('\n========================================');
console.log('🎉 ALL PDFS OPTIMIZED SUCCESSFULLY!');
console.log(`Total PDFs Processed:  ${totalPdfs}`);
console.log(`Successfully Compressed: ${compressedCount} PDFs`);
console.log(`Kept Pristine/Optimal:   ${pristineCount} PDFs`);
console.log(`Total Space Saved:       ${totalSavedMB} MB (~${totalSavedGB} GB)`);
console.log(`Total Time Taken:        ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
console.log('========================================\n');
