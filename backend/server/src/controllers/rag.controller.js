const openai = require('../config/openai');
const ragService = require('../services/rag');
const embeddings = require('../services/embeddings');

const DEFAULT_INDEX = process.env.RAG_COLLECTION || 'knowledge_documents';
const DEFAULT_MODEL = process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini';

const DEFAULT_MAPPINGS = {
  properties: {
    title: { type: 'text' },
    content: { type: 'text' },
    metadata: { type: 'object', enabled: true },
    embedding: { type: 'float' },
    entities: {
      type: 'nested',
      properties: {
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        description: { type: 'text' }
      }
    },
    chunks: { type: 'text' }, // legacy text field retained for backwards compatibility
    chunkVectors: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        content: { type: 'text' },
        embedding: { type: 'float' },
        metadata: { type: 'object', enabled: true }
      }
    },
    relationships: {
      type: 'nested',
      properties: {
        source: { type: 'keyword' },
        target: { type: 'keyword' },
        type: { type: 'keyword' },
        description: { type: 'text' }
      }
    },
    updatedAt: { type: 'date' }
  }
};

function getProvider() {
  return ragService.getProvider();
}

function getElasticsearchClient() {
  const provider = getProvider();
  if (!provider.client) {
    throw new Error('RAG provider does not expose an Elasticsearch client.');
  }
  return provider.client;
}

function unwrapBody(response) {
  if (!response) return response;
  return response.body ?? response;
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function buildGraphFromDocuments(documents = []) {
  const nodes = new Map();
  const edges = [];

  documents.forEach(doc => {
    (doc.entities || []).forEach(entity => {
      if (!nodes.has(entity.name)) {
        nodes.set(entity.name, { name: entity.name, type: entity.type || 'unknown' });
      }
    });

    (doc.relationships || []).forEach(rel => {
      edges.push({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        description: rel.description || null
      });

      if (rel.source && !nodes.has(rel.source)) {
        nodes.set(rel.source, { name: rel.source, type: 'derived' });
      }
      if (rel.target && !nodes.has(rel.target)) {
        nodes.set(rel.target, { name: rel.target, type: 'derived' });
      }
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}

function buildWorkflowPrompt(query, documents) {
  if (!documents.length) {
    return `Question: ${query}`;
  }

  const context = documents
    .map((doc, idx) => {
      const title = doc.title || doc.metadata?.title || `Document ${idx + 1}`;
      const snippet = (doc.content || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000);
      return `Document ${idx + 1}: ${title}\nSource: ${doc.metadata?.source || doc.metadata?.path || doc.id}\nExcerpt: ${snippet}`;
    })
    .join('\n\n');

  return `You are answering the user question using the knowledge base excerpts below. Cite the document numbers when referencing evidence.\n\nContext:\n${context}\n\nQuestion:\n${query}`;
}

async function listIndexes(req, res, next) {
  try {
    const client = getElasticsearchClient();
    const response = unwrapBody(await client.cat.indices({ format: 'json' }));
    const indexes = (Array.isArray(response) ? response : [])
      .map(idx => ({
        name: idx.index,
        health: idx.health,
        status: idx.status,
        uuid: idx.uuid,
        pri: Number(idx.pri) || null,
        rep: Number(idx.rep) || null,
        docsCount: Number(idx['docs.count']) || null,
        docsDeleted: Number(idx['docs.deleted']) || null,
        storeSize: idx['store.size'] || null,
        priStoreSize: idx['pri.store.size'] || null
      }));

    res.json({ success: true, data: indexes });
  } catch (error) {
    next(error);
  }
}

async function createIndex(req, res, next) {
  try {
    const { name, settings = {}, mappings } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Index name is required' });
    }

    const client = getElasticsearchClient();
    const body = {};
    const indexSettings = { ...settings };
    if (!indexSettings.number_of_shards) {
      indexSettings.number_of_shards = 1;
    }
    if (!indexSettings.number_of_replicas) {
      indexSettings.number_of_replicas = 0;
    }
    body.settings = indexSettings;
    body.mappings = mappings && Object.keys(mappings).length > 0 ? mappings : DEFAULT_MAPPINGS;

    const response = await client.indices.create({ index: name, body });

    res.status(201).json({ success: true, data: unwrapBody(response) });
  } catch (error) {
    if (error.meta?.statusCode === 400) {
      return res.status(400).json({ success: false, error: error.meta?.body?.error?.reason || 'Index creation failed' });
    }
    next(error);
  }
}

async function deleteIndex(req, res, next) {
  try {
    const { indexName } = req.params;
    const client = getElasticsearchClient();
    await client.indices.delete({ index: indexName });
    res.status(204).send();
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return res.status(404).json({ success: false, error: 'Index not found' });
    }
    next(error);
  }
}

async function listDocuments(req, res, next) {
  try {
    const { indexName } = req.params;
    const limit = clampNumber(req.query.limit || 20, 1, 200);
    const from = clampNumber(req.query.from || 0, 0, 10000);
    const queryText = req.query.q || req.query.query;

    const body = queryText
      ? {
          query: {
            multi_match: {
              query: queryText,
              fields: ['content', 'title', 'metadata.*', 'entities.name']
            }
          }
        }
      : { query: { match_all: {} } };

    const client = getElasticsearchClient();
    const response = unwrapBody(
      await client.search({
        index: indexName,
        size: limit,
        from,
        body
      })
    );

    const hits = response?.hits?.hits || [];
    const documents = hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source
    }));

    res.json({
      success: true,
      data: {
        index: indexName,
        total: response?.hits?.total?.value ?? hits.length,
        count: documents.length,
        documents
      }
    });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return res.status(404).json({ success: false, error: 'Index or documents not found' });
    }
    next(error);
  }
}

async function getDocumentFromIndex(req, res, next) {
  try {
    const { indexName, documentId } = req.params;
    const client = getElasticsearchClient();
    const response = unwrapBody(await client.get({ index: indexName, id: documentId }));

    res.json({
      success: true,
      data: {
        id: response?._id,
        index: response?._index,
        found: response?.found,
        source: response?._source || null
      }
    });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    next(error);
  }
}

async function getDocumentById(req, res, next) {
  try {
    const { documentId } = req.params;
    const indexName = req.query.index || DEFAULT_INDEX;
    const client = getElasticsearchClient();
    const response = unwrapBody(await client.get({ index: indexName, id: documentId }));

    res.json({
      success: true,
      data: {
        id: response?._id,
        index: response?._index,
        found: response?.found,
        source: response?._source || null
      }
    });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    next(error);
  }
}

async function createDocument(req, res, next) {
  try {
    const { indexName } = req.params;
    const {
      id,
      title,
      content,
      metadata = {},
      entities = [],
      relationships = [],
      chunkVectors = [],
      chunks = [],
      vectorize = true
    } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const provider = getProvider();
    const document = {
      id,
      title,
      content,
      metadata,
      entities,
      relationships,
      chunkVectors: chunkVectors.length ? chunkVectors : chunks
    };

    await provider.indexDocument(indexName, document, { vectorize });

    res.status(201).json({ success: true, data: { index: indexName, id: id || null } });
  } catch (error) {
    next(error);
  }
}

async function updateDocument(req, res, next) {
  try {
    const { indexName, documentId } = req.params;
    const { doc, docAsUpsert = false } = req.body;

    if (!doc || typeof doc !== 'object') {
      return res.status(400).json({ success: false, error: 'doc payload is required' });
    }

    const client = getElasticsearchClient();
    const response = unwrapBody(
      await client.update({
        index: indexName,
        id: documentId,
        doc,
        doc_as_upsert: Boolean(docAsUpsert)
      })
    );

    res.json({ success: true, data: response });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { indexName, documentId } = req.params;
    const provider = getProvider();
    await provider.deleteDocument(indexName, documentId);
    res.status(204).send();
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    next(error);
  }
}

async function searchGraph(req, res, next) {
  try {
    const { query, index, metadata, topK, includeRelations = true } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const collection = index || DEFAULT_INDEX;
    const provider = getProvider();
    const limit = clampNumber(topK || 5, 1, 50);
    const filters = metadata && typeof metadata === 'object' ? metadata : {};
    const modeInput = (req.body.searchMode || req.body.mode || 'keyword').toLowerCase();
    const requiresVector = modeInput === 'vector' || modeInput === 'hybrid';
    let vectorOptions = null;

    if (requiresVector) {
      try {
        const queryEmbedding = await embeddings.embedText(query);
        if (!queryEmbedding) {
          throw new Error('Embedding provider returned no data');
        }

        const vectorWeightInput = Number(req.body.vectorWeight);
        const textWeightInput = Number(req.body.textWeight);
        const candidateInput = Number(req.body.candidateCount);

        vectorOptions = {
          embedding: queryEmbedding,
          mode: modeInput,
          vectorWeight: Number.isFinite(vectorWeightInput) ? clampNumber(vectorWeightInput, 0, 1) : undefined,
          textWeight: Number.isFinite(textWeightInput) ? clampNumber(textWeightInput, 0, 1) : undefined,
          candidateCount: Number.isFinite(candidateInput) ? clampNumber(candidateInput, limit, 500) : undefined
        };
      } catch (error) {
        console.error('[RAG] Failed to embed query for vector search', error.message);
        return res.status(500).json({ success: false, error: 'Failed to generate query embedding' });
      }
    }

    const documents = await provider.search(collection, query, {
      limit,
      filters,
      vector: vectorOptions
    });

    const payload = {
      index: collection,
      query,
      searchMode: requiresVector ? modeInput : 'keyword',
      count: documents.length,
      documents
    };

    if (includeRelations) {
      payload.graph = buildGraphFromDocuments(documents);
    }

    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
}

async function runBasicWorkflow(req, res, next) {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const collection = options.index || DEFAULT_INDEX;
    const provider = getProvider();
    const contextLimit = clampNumber(options.maxContextItems || 6, 1, 15);
    const filters = options.metadata && typeof options.metadata === 'object' ? options.metadata : {};

    const searchMode = (options.searchMode || options.mode || 'keyword').toLowerCase();
    let workflowVectorOptions = null;

    if (searchMode === 'vector' || searchMode === 'hybrid') {
      try {
        const queryEmbedding = await embeddings.embedText(query);
        if (!queryEmbedding) {
          throw new Error('Embedding provider returned no data');
        }
        const vectorWeightInput = Number(options.vectorWeight);
        const textWeightInput = Number(options.textWeight);
        const candidateInput = Number(options.candidateCount);

        workflowVectorOptions = {
          embedding: queryEmbedding,
          mode: searchMode,
          vectorWeight: Number.isFinite(vectorWeightInput) ? clampNumber(vectorWeightInput, 0, 1) : undefined,
          textWeight: Number.isFinite(textWeightInput) ? clampNumber(textWeightInput, 0, 1) : undefined,
          candidateCount: Number.isFinite(candidateInput)
            ? clampNumber(candidateInput, contextLimit, 500)
            : undefined
        };
      } catch (error) {
        console.error('[Workflow] Failed to embed query', error.message);
      }
    }

    const documents = await provider.search(collection, query, {
      limit: contextLimit,
      filters,
      vector: workflowVectorOptions
    });

    const userPrompt = buildWorkflowPrompt(query, documents);
    const model = options.llmModel || DEFAULT_MODEL;
    const temperature = options.temperature !== undefined ? clampNumber(options.temperature, 0, 2) : 0.2;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant that cites document numbers when answering.';

    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const choice = completion.choices?.[0]?.message || null;

    res.json({
      success: true,
      data: {
        query,
        index: collection,
        answer: choice?.content || null,
        contextCount: documents.length,
        searchMode,
        context: documents,
        llm: {
          model,
          usage: completion.usage || null,
          finishReason: completion.choices?.[0]?.finish_reason || null
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listIndexes,
  createIndex,
  deleteIndex,
  listDocuments,
  getDocumentFromIndex,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  searchGraph,
  runBasicWorkflow
};
