const { Client } = require('@elastic/elasticsearch');
const RagProvider = require('../../interfaces/RagProvider');

class ElasticsearchProvider extends RagProvider {
  constructor(config) {
    super();
    this.client = new Client({
      node: config.node,
      auth: {
        username: config.username,
        password: config.password
      }
    });
  }

  async connect() {
    try {
      const health = await this.client.cluster.health();
      console.log('Elasticsearch connected:', health.status);
      return true;
    } catch (error) {
      console.error('Elasticsearch connection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async indexDocument(collection, document) {
    const { id, entities, relationships, ...body } = document;
    
    // For Elasticsearch, we flatten entities/relationships into the document
    // so they can be keyword searched or retrieved.
    // In a true GraphDB, these would be nodes and edges.
    const esDocument = {
      ...body,
      entities: entities || [],
      relationships: relationships || [],
      updatedAt: new Date()
    };

    await this.client.index({
      index: collection,
      id: id, // Explicitly set ID if provided, otherwise ES generates one
      document: esDocument,
      refresh: true // Make searchable immediately (careful with performance in prod)
    });
  }

  async search(collection, query, options = {}) {
    const { limit = 5, filters = {} } = options;
    
    // Basic text search implementation
    // TODO: Enhance with vector search if embeddings are provided in options
    const searchBody = {
      query: {
        bool: {
          must: [
            { 
              multi_match: { 
                query: query, 
                // Search across content, title, and now entities too
                fields: ['content', 'title', 'metadata.*', 'entities.name'] 
              } 
            }
          ]
        }
      },
      size: limit
    };

    // Apply filters if any
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        searchBody.query.bool.filter = searchBody.query.bool.filter || [];
        searchBody.query.bool.filter.push({ term: { [key]: value } });
      });
    }

    const result = await this.client.search({
      index: collection,
      body: searchBody
    });

    return result.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source
    }));
  }

  async deleteDocument(collection, id) {
    await this.client.delete({
      index: collection,
      id: id
    });
  }
}

module.exports = ElasticsearchProvider;
