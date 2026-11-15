import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.join(__dirname, 'hashWorker.js');

class WorkerPool {
  constructor(size = Math.max(2, os.cpus().length || 4)) {
    this.size = size;
    this.workers = [];
    this.freeWorkers = [];
    this.taskQueue = [];
    this.pendingTasks = new Map();
    this.taskIdCounter = 1;
    this.init();
  }

  init() {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(workerPath);
      worker.on('message', (msg) => this.onMessage(worker, msg));
      worker.on('error', (err) => {
        console.error('Worker thread error:', err);
        this.replaceWorker(worker);
      });
      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  replaceWorker(deadWorker) {
    const idx = this.workers.indexOf(deadWorker);
    if (idx !== -1) this.workers.splice(idx, 1);
    const freeIdx = this.freeWorkers.indexOf(deadWorker);
    if (freeIdx !== -1) this.freeWorkers.splice(freeIdx, 1);
    deadWorker.terminate();

    const newWorker = new Worker(workerPath);
    newWorker.on('message', (msg) => this.onMessage(newWorker, msg));
    this.workers.push(newWorker);
    this.freeWorkers.push(newWorker);
    this.processNext();
  }

  onMessage(worker, msg) {
    const { taskId, success, result, error } = msg;
    const promiseHandlers = this.pendingTasks.get(taskId);
    if (promiseHandlers) {
      this.pendingTasks.delete(taskId);
      if (success) {
        promiseHandlers.resolve(result);
      } else {
        promiseHandlers.reject(new Error(error));
      }
    }
    this.freeWorkers.push(worker);
    this.processNext();
  }

  processNext() {
    if (this.freeWorkers.length === 0 || this.taskQueue.length === 0) return;
    const worker = this.freeWorkers.shift();
    const task = this.taskQueue.shift();
    worker.postMessage(task);
  }

  execute(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const taskId = this.taskIdCounter++;
      this.pendingTasks.set(taskId, { resolve, reject });
      const task = { taskId, type, ...payload };
      this.taskQueue.push(task);
      this.processNext();
    });
  }

  clearQueue() {
    this.taskQueue = [];
    for (const [, handlers] of this.pendingTasks.entries()) {
      handlers.resolve(null);
    }
    this.pendingTasks.clear();
  }

  destroy() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.freeWorkers = [];
    this.pendingTasks.clear();
    this.taskQueue = [];
  }
}

export const workerPool = new WorkerPool();
