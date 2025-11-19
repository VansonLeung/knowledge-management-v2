const { Queue, Worker } = require('bullmq');
const QueueProvider = require('./QueueProvider');

class BullQueue extends QueueProvider {
  constructor(name, config) {
    super(name);
    this.queue = new Queue(name, {
      connection: {
        host: config.host,
        port: config.port,
        password: config.password || undefined
      }
    });
    this.worker = null;
  }

  async addJob(name, data) {
    await this.queue.add(name, data, { removeOnComplete: true, removeOnFail: true });
  }

  process(handler) {
    this.worker = new Worker(this.name, async job => handler({ name: job.name, data: job.data }), {
      connection: this.queue.opts.connection
    });
    this.worker.on('failed', err => {
      console.error(`[BullQueue] Job failed`, err);
    });
  }
}

module.exports = BullQueue;
