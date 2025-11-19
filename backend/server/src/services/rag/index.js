const ElasticsearchProvider = require('./ElasticsearchProvider');

class RagService {
  constructor() {
    this.provider = null;
  }

  initialize(type, config) {
    switch (type) {
      case 'elasticsearch':
        this.provider = new ElasticsearchProvider(config);
        break;
      // Future: case 'graphrag': ...
      default:
        throw new Error(`Unsupported RAG provider type: ${type}`);
    }
    return this.provider.connect();
  }

  getProvider() {
    if (!this.provider) {
      throw new Error('RAG Service not initialized. Call initialize() first.');
    }
    return this.provider;
  }
}

// Singleton instance
const ragService = new RagService();
module.exports = ragService;
