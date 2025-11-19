const QueueProvider = require('./QueueProvider');

class InMemoryQueue extends QueueProvider {
  constructor(name) {
    super(name);
    this.jobs = [];
    this.processing = false;
    this.handler = null;
  }

  async addJob(name, data) {
    this.jobs.push({ name, data });
    this.schedule();
  }

  process(handler) {
    this.handler = handler;
    this.schedule();
  }

  async schedule() {
    if (this.processing) return;
    if (!this.handler) return;
    if (this.jobs.length === 0) return;

    this.processing = true;
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      try {
        await this.handler(job);
      } catch (error) {
        console.error(`[InMemoryQueue] Job failed`, error);
      }
    }
    this.processing = false;
  }
}

module.exports = InMemoryQueue;
