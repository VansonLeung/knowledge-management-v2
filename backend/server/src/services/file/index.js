const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { File, Folder, ConversationFile, Conversation } = require('../../models');
const { getProvider: getStorageProvider } = require('../storage');
const { getQueue } = require('../queue');
const ragService = require('../rag');
const { chunkText } = require('../../utils/text');
const { embedTexts, averageEmbedding } = require('../embeddings');

const COLLECTION_NAME = process.env.RAG_COLLECTION || 'knowledge_documents';
const pymupdfServiceUrl = process.env.PYMUPDF_SERVICE_URL || 'http://localhost:16002';
const chunkingServiceUrl = process.env.CHUNKING_SERVICE_URL || 'http://localhost:8001';

function normalizeOriginalName(value) {
  if (typeof value !== 'string' || !value) return 'uploaded-file';
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch (error) {
    return value;
  }
}

function buildChunkPayloads(fileId, chunks, embeddings = []) {
  if (!Array.isArray(chunks) || !chunks.length) return [];

  return chunks.map((chunk, idx) => {
    const descriptor = typeof chunk === 'string' ? { content: chunk } : chunk;
    const metadata = descriptor.metadata && Object.keys(descriptor.metadata).length ? descriptor.metadata : undefined;

    return {
      id: `${fileId}::${idx}`,
      content: descriptor.content,
      embedding: Array.isArray(embeddings[idx]) ? embeddings[idx] : null,
      metadata
    };
  });
}

async function buildChunkDescriptors(markdown, pageEntries = []) {
  if (Array.isArray(pageEntries) && pageEntries.length) {
    const chunks = [];
    for (const entry of pageEntries) {
      const text = typeof entry.text === 'string' ? entry.text.trim() : '';
      const markdownContent = typeof entry.markdown === 'string' ? entry.markdown.trim() : '';
      const pageContent = markdownContent || text;

      if (!pageContent) continue;

      try {
        const response = await axios.post(`${chunkingServiceUrl}/chunk`, {
          text: pageContent,
          chunk_size: 1000,
          chunk_overlap: 200,
          metadata: { pageNumber: entry.page }
        });

        if (response.data && Array.isArray(response.data.chunks)) {
          chunks.push(...response.data.chunks.map(c => ({
            content: c.text,
            metadata: c.metadata
          })));
        }
      } catch (error) {
        console.warn(`[FileService] Chunking failed for page ${entry.page}:`, error.message);
      }
    }
    return chunks;
  }

  try {
    const response = await axios.post(`${chunkingServiceUrl}/chunk`, {
      text: markdown,
      chunk_size: 1000,
      chunk_overlap: 200
    });

    if (response.data && Array.isArray(response.data.chunks)) {
      return response.data.chunks.map(c => ({
        content: c.text,
        metadata: c.metadata
      }));
    }
  } catch (error) {
    console.warn('[FileService] Chunking failed for document:', error.message);
  }

  return [];
}

function normalizeEntities(entities = []) {
  if (!Array.isArray(entities)) {
    return [];
  }

  return entities
    .map(entity => {
      if (!entity) return null;

      const name = entity.name ?? entity.value;
      if (!name) return null;

      const normalized = {
        name: String(name),
        type: entity.type ? String(entity.type) : 'unknown'
      };

      if (entity.description) {
        normalized.description = String(entity.description);
      }

      return normalized;
    })
    .filter(Boolean);
}

async function syncRagDocumentMetadata(fileId, metadataPatch = {}) {
  try {
    const provider = ragService.getProvider();
    
    await provider.updateDocumentsMetadata(COLLECTION_NAME, {
      term: { 'metadata.fileId.keyword': fileId }
    }, metadataPatch);

    return true;
  } catch (error) {
    console.warn(`[FileService] Failed to sync RAG metadata for ${fileId}:`, error.message);
    return null;
  }
}

async function syncFileFolderMetadata(file, folder) {
  const metadata = { ...(file.metadata || {}) };
  if (folder) {
    metadata.folderPath = folder.referencePath;
    metadata.folderId = folder.id;
  } else {
    delete metadata.folderPath;
    delete metadata.folderId;
  }

  await file.update({ metadata });
  await syncRagDocumentMetadata(file.id, {
    folderId: folder ? folder.id : null,
    folderPath: folder ? folder.referencePath : null
  });
}

function buildReferencePath(name, parentFolder) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    const error = new Error('Folder name is required');
    error.statusCode = 400;
    throw error;
  }
  return parentFolder ? `${parentFolder.referencePath}/${trimmed}` : trimmed;
}

async function assertParentIsValid(folder, nextParentId) {
  if (!nextParentId) return null;
  if (folder && folder.id === nextParentId) {
    const error = new Error('Folder cannot be its own parent');
    error.statusCode = 400;
    throw error;
  }

  const parent = await Folder.findOne({ where: { id: nextParentId, ownerId: folder.ownerId } });
  if (!parent) {
    const error = new Error('Parent folder not found');
    error.statusCode = 404;
    throw error;
  }

  let cursor = parent;
  while (cursor) {
    if (cursor.id === folder.id) {
      const circularError = new Error('Cannot move folder into its descendant');
      circularError.statusCode = 400;
      throw circularError;
    }
    if (!cursor.parentId) break;
    cursor = await Folder.findOne({ where: { id: cursor.parentId, ownerId: folder.ownerId } });
  }

  return parent;
}

async function refreshFolderTree(folder) {
  const queue = [folder];
  while (queue.length) {
    const current = queue.shift();
    await current.save();
    const files = await File.findAll({ where: { folderId: current.id } });
    await Promise.all(files.map(file => syncFileFolderMetadata(file, current)));

    const children = await Folder.findAll({ where: { parentId: current.id, ownerId: current.ownerId } });
    children.forEach(child => {
      child.referencePath = `${current.referencePath}/${child.name}`;
      queue.push(child);
    });
  }
}

async function ensureFolderOwnership(folderId, userId) {
  if (!folderId) return null;
  const folder = await Folder.findOne({ where: { id: folderId, ownerId: userId } });
  if (!folder) {
    const error = new Error('Folder not found');
    error.statusCode = 404;
    throw error;
  }
  return folder;
}

async function saveUploadedFile(user, uploadedFile, { folderId = null, conversationIds = [] }) {
  const storage = getStorageProvider();
  const folder = await ensureFolderOwnership(folderId, user.id);
  let ownedConversationIds = [];

  const originalName = normalizeOriginalName(uploadedFile.originalname);
  const folderMetadata = {};
  if (folder) {
    folderMetadata.folderPath = folder.referencePath;
    folderMetadata.folderId = folder.id;
  }

  if (conversationIds && conversationIds.length) {
    const conversations = await Conversation.findAll({
      where: { id: conversationIds, userId: user.id },
      attributes: ['id']
    });
    ownedConversationIds = conversations.map(c => c.id);
  }

  const stored = await storage.save(uploadedFile.buffer, { originalName });

  const fileRecord = await File.create({
    name: path.parse(originalName).name || originalName,
    originalName,
    mimeType: uploadedFile.mimetype,
    size: uploadedFile.size,
    storagePath: stored.path,
    ownerId: user.id,
    folderId: folder ? folder.id : null,
    status: 'pending',
    metadata: folderMetadata
  });

  if (ownedConversationIds.length) {
    const rows = ownedConversationIds.map(conversationId => ({ conversationId, fileId: fileRecord.id }));
    await ConversationFile.bulkCreate(rows, { ignoreDuplicates: true });
  }

  await enqueueFileForProcessing(fileRecord.id);
  return fileRecord;
}

async function enqueueFileForProcessing(fileId) {
  const queue = getQueue();
  await queue.addJob('process-file', { fileId });
}

async function listFiles(userId, { folderId, scope } = {}) {
  const where = { ownerId: userId };

  if (scope === 'uncategorized') {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }

  const files = await File.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });
  return files;
}

async function deleteFile(userId, fileId) {
  const storage = getStorageProvider();
  const provider = ragService.getProvider();
  const file = await File.findOne({ where: { id: fileId, ownerId: userId } });
  if (!file) {
    const err = new Error('File not found');
    err.statusCode = 404;
    throw err;
  }

  await storage.remove(file.storagePath);
  await File.destroy({ where: { id: fileId } });
  await ConversationFile.destroy({ where: { fileId } });
  
  // Delete all chunks associated with this file
  try {
    await provider.deleteDocumentsByQuery(COLLECTION_NAME, {
      term: { 'metadata.fileId.keyword': fileId }
    });
  } catch (error) {
    console.warn(`[FileService] Failed to delete chunks for file ${fileId}:`, error.message);
  }
  
  return true;
}

async function fetchPdfAsMarkdown(fileRecord) {
  const storage = getStorageProvider();
  const fileStream = await storage.createReadStream(fileRecord.storagePath);

  const form = new FormData();
  form.append('file', fileStream, {
    filename: fileRecord.originalName,
    contentType: fileRecord.mimeType
  });

  const response = await axios.post(`${pymupdfServiceUrl}/convert/pdf-to-markdown`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  return response.data.markdown;
}

async function analyzePdf(fileRecord) {
  const storage = getStorageProvider();
  const fileStream = await storage.createReadStream(fileRecord.storagePath);

  const form = new FormData();
  form.append('file', fileStream, {
    filename: fileRecord.originalName,
    contentType: fileRecord.mimeType
  });

  const response = await axios.post(`${pymupdfServiceUrl}/analyze/pdf`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  return response.data;
}

async function readFileAsText(fileRecord) {
  const storage = getStorageProvider();
  const buffer = await storage.readFile(fileRecord.storagePath);
  return buffer.toString('utf-8');
}

async function extractFileContent(fileRecord) {
  if (fileRecord.mimeType === 'application/pdf') {
    try {
      return await analyzePdf(fileRecord);
    } catch (error) {
      console.warn('[FileService] analyze/pdf failed, falling back to markdown only', error.message);
      const markdown = await fetchPdfAsMarkdown(fileRecord);
      return {
        markdown,
        metadata: { mimeType: fileRecord.mimeType },
        entities: [],
        pages: []
      };
    }
  }

  const textualTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
  if (textualTypes.includes(fileRecord.mimeType)) {
    const text = await readFileAsText(fileRecord);
    return {
      markdown: text,
      metadata: { mimeType: fileRecord.mimeType },
      entities: [],
      pages: []
    };
  }

  throw new Error(`Unsupported file type: ${fileRecord.mimeType}`);
}

async function listFolders(userId) {
  const folders = await Folder.findAll({
    where: { ownerId: userId },
    order: [['referencePath', 'ASC'], ['createdAt', 'ASC']]
  });
  return folders;
}

async function createFolder(userId, { name, parentId = null }) {
  const folderName = String(name || '').trim();
  if (!folderName) {
    const error = new Error('Folder name is required');
    error.statusCode = 400;
    throw error;
  }

  const parent = parentId ? await ensureFolderOwnership(parentId, userId) : null;
  const referencePath = buildReferencePath(folderName, parent || null);

  const folder = await Folder.create({
    name: folderName,
    ownerId: userId,
    parentId: parent ? parent.id : null,
    referencePath
  });

  return folder;
}

async function updateFolder(userId, folderId, { name, parentId } = {}) {
  const folder = await Folder.findOne({ where: { id: folderId, ownerId: userId } });
  if (!folder) {
    const error = new Error('Folder not found');
    error.statusCode = 404;
    throw error;
  }

  const nextName = name ? String(name).trim() : folder.name;
  if (!nextName) {
    const error = new Error('Folder name is required');
    error.statusCode = 400;
    throw error;
  }

  const nextParentId = parentId === undefined ? folder.parentId : parentId || null;
  let nextParent = null;
  if (nextParentId) {
    nextParent = await assertParentIsValid(folder, nextParentId);
  }

  folder.name = nextName;
  folder.parentId = nextParent ? nextParent.id : null;
  folder.referencePath = buildReferencePath(nextName, nextParent || null);

  await refreshFolderTree(folder);
  return folder;
}

async function moveFile(userId, fileId, folderId = null) {
  const file = await File.findOne({ where: { id: fileId, ownerId: userId } });
  if (!file) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  const folder = folderId ? await ensureFolderOwnership(folderId, userId) : null;
  const metadata = { ...(file.metadata || {}) };
  if (folder) {
    metadata.folderPath = folder.referencePath;
    metadata.folderId = folder.id;
  } else {
    delete metadata.folderPath;
    delete metadata.folderId;
  }

  await file.update({
    folderId: folder ? folder.id : null,
    metadata
  });

  await syncRagDocumentMetadata(file.id, {
    folderId: folder ? folder.id : null,
    folderPath: folder ? folder.referencePath : null
  });

  return file;
}

async function getFileDiagnostics(userId, fileId) {
  const file = await File.findOne({ where: { id: fileId, ownerId: userId } });
  if (!file) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  let document = null;
  try {
    const provider = ragService.getProvider();
    // Since we index chunks separately, we search for them
    const results = await provider.search(COLLECTION_NAME, null, {
      filters: { 'metadata.fileId': fileId },
      limit: 5
    });
    document = { 
      chunksFound: results.length, 
      sampleChunks: results,
      note: "Document is indexed as individual chunks."
    };
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  return { file, document };
}

async function processFile(fileId) {
  const fileRecord = await File.findByPk(fileId);
  if (!fileRecord) {
    console.warn(`[FileService] File ${fileId} not found`);
    return;
  }

  try {
    await fileRecord.update({ status: 'processing', error: null });

    const { markdown, metadata: extractedMetadata = {}, entities = [], pages = [] } = await extractFileContent(fileRecord);
    if (!markdown) {
      throw new Error('No textual content returned from extractor');
    }
    const pageEntries = Array.isArray(pages) ? pages : [];
    const chunkDescriptors = await buildChunkDescriptors(markdown, pageEntries);
    const normalizedEntities = normalizeEntities(entities);
    let chunkEmbeddings = [];

    if (chunkDescriptors.length) {
      try {
        chunkEmbeddings = await embedTexts(chunkDescriptors.map(descriptor => descriptor.content));
      } catch (error) {
        console.warn(`[FileService] Failed to generate embeddings for file ${fileId}:`, error.message);
      }
    }

    const chunkPayloads = buildChunkPayloads(fileRecord.id, chunkDescriptors, chunkEmbeddings);
    
    const provider = ragService.getProvider();
    
    // Index each chunk as a separate document
    for (const chunk of chunkPayloads) {
      const chunkDoc = {
        id: chunk.id,
        title: fileRecord.name,
        content: chunk.content,
        metadata: {
          originalName: fileRecord.originalName,
          folderId: fileRecord.folderId,
          ownerId: fileRecord.ownerId,
          storagePath: fileRecord.storagePath,
          fileId: fileRecord.id,
          ...fileRecord.metadata,
          ...extractedMetadata,
          pageCount: pageEntries.length || undefined,
          ...chunk.metadata
        },
        entities: normalizedEntities,
        relationships: [],
        embedding: chunk.embedding
      };
      
      await provider.indexDocument(COLLECTION_NAME, chunkDoc, { vectorize: false });
    }

    await fileRecord.update({
      status: 'ready',
      metadata: {
        ...fileRecord.metadata,
        ...extractedMetadata,
        pageCount: pageEntries.length || undefined,
        chunkCount: chunkPayloads.length
      }
    });
  } catch (error) {
    console.error('[FileService] Processing failed', error);
    await fileRecord.update({
      status: 'failed',
      error: error.message
    });
  }
}

module.exports = {
  saveUploadedFile,
  listFiles,
  deleteFile,
  enqueueFileForProcessing,
  processFile,
  listFolders,
  createFolder,
  updateFolder,
  moveFile,
  getFileDiagnostics
};
