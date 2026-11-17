import mongoose from 'mongoose';

/**
 * Executes a DB operation with retry queue if mongoose is not ready or throws a transient error.
 * @param {Function} op - Async function that performs the DB write
 * @param {string} label - Logging label e.g. '[DB] FolderBatch live write'
 * @param {number} maxRetries - Maximum retry attempts (default 3)
 * @param {number} delayMs - Delay between retries in milliseconds (default 2000)
 */
export async function withDbRetry(op, label = '[DB] operation', maxRetries = 3, delayMs = 2000) {
  let attempt = 0;

  async function execute() {
    attempt++;
    if (mongoose.connection?.readyState !== 1) {
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
        return execute();
      }
      console.error(`${label} failed: MongoDB not connected (readyState=${mongoose.connection?.readyState})`);
      return null;
    }

    try {
      return await op();
    } catch (err) {
      // Ignore duplicate key errors (code 11000) without retrying
      if (err.code === 11000) {
        return null;
      }
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
        return execute();
      }
      console.error(`${label} failed after ${maxRetries} retries:`, err.message);
      return null;
    }
  }

  return execute();
}
