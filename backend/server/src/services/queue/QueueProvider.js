class QueueProvider {
  constructor(name) {
    if (new.target === QueueProvider) {
      throw new Error('QueueProvider is abstract');
    }
    this.name = name;
  }

  async addJob(name, data) {
    throw new Error('addJob() must be implemented');
  }

  process(handler) {
    throw new Error('process() must be implemented');
  }
}

module.exports = QueueProvider;
