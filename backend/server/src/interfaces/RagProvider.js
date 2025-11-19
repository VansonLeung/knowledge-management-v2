/**
 * @typedef {Object} RagEntity
 * @property {string} name - The name of the entity
 * @property {string} type - The type of the entity (e.g., "Person", "Organization")
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} RagRelationship
 * @property {string} source - The source entity name
 * @property {string} target - The target entity name
 * @property {string} type - The type of relationship (e.g., "WORKS_FOR")
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} RagDocument
 * @property {string} id - Unique identifier
 * @property {string} content - The main textual content
 * @property {string} [title] - Document title
 * @property {Object} [metadata] - Arbitrary metadata (e.g., file path, author)
 * @property {RagEntity[]} [entities] - Extracted entities for GraphRAG
 * @property {RagRelationship[]} [relationships] - Extracted relationships for GraphRAG
 * @property {string[]} [chunks] - Pre-calculated chunks if available
 */

/**
 * Interface for RAG (Retrieval-Augmented Generation) Providers.
 * Any search engine or graph database adapter must implement these methods.
 */
class RagProvider {
  constructor() {
    if (this.constructor === RagProvider) {
      throw new Error("Abstract class 'RagProvider' cannot be instantiated directly.");
    }
  }

  /**
   * Initialize connection to the provider
   */
  async connect() {
    throw new Error("Method 'connect()' must be implemented.");
  }

  /**
   * Check health of the provider
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error("Method 'healthCheck()' must be implemented.");
  }

  /**
   * Index a document
   * @param {string} collection - The collection/index name
   * @param {RagDocument} document - The complex document object
   * @returns {Promise<void>}
   */
  async indexDocument(collection, document) {
    throw new Error("Method 'indexDocument()' must be implemented.");
  }

  /**
   * Search for documents
   * @param {string} collection - The collection/index name
   * @param {string} query - The search query text
   * @param {Object} options - Search options (limit, filters, vector, hybrid, etc.)
   * @returns {Promise<Array>} - Array of matching documents with scores
   */
  async search(collection, query, options = {}) {
    throw new Error("Method 'search()' must be implemented.");
  }

  /**
   * Delete a document
   * @param {string} collection - The collection/index name
   * @param {string} id - The document ID
   * @returns {Promise<void>}
   */
  async deleteDocument(collection, id) {
    throw new Error("Method 'deleteDocument()' must be implemented.");
  }
}

module.exports = RagProvider;
