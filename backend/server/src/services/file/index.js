const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { File, Folder, ConversationFile, Conversation } = require('../../models');
const { getProvider: getStorageProvider } = require('../storage');
const { getQueue } = require('../queue');
const ragService = require('../rag');
const { chunkText } = require('../../utils/text');

const COLLECTION_NAME = process.env.RAG_COLLECTION || 'knowledge_documents';
const pymupdfServiceUrl = process.env.PYMUPDF_SERVICE_URL || 'http://localhost:16002';

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

  if (conversationIds && conversationIds.length) {
    const conversations = await Conversation.findAll({
      where: { id: conversationIds, userId: user.id },
      attributes: ['id']
    });
    ownedConversationIds = conversations.map(c => c.id);
  }

  const stored = await storage.save(uploadedFile.buffer, { originalName: uploadedFile.originalname });

  const fileRecord = await File.create({
    name: path.parse(uploadedFile.originalname).name,
    originalName: uploadedFile.originalname,
    mimeType: uploadedFile.mimetype,
    size: uploadedFile.size,
    storagePath: stored.path,
    ownerId: user.id,
    folderId: folder ? folder.id : null,
    status: 'pending',
    metadata: {
      folderPath: folder ? folder.referencePath : null
    }
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

async function listFiles(userId, { folderId } = {}) {
  const where = { ownerId: userId };
  if (folderId) where.folderId = folderId;

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
  await provider.deleteDocument(COLLECTION_NAME, fileId);
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
        entities: []
      };
    }
  }

  const textualTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];
  if (textualTypes.includes(fileRecord.mimeType)) {
    const text = await readFileAsText(fileRecord);
    return {
      markdown: text,
      metadata: { mimeType: fileRecord.mimeType },
      entities: []
    };
  }

  throw new Error(`Unsupported file type: ${fileRecord.mimeType}`);
}

async function processFile(fileId) {
  const fileRecord = await File.findByPk(fileId);
  if (!fileRecord) {
    console.warn(`[FileService] File ${fileId} not found`);
    return;
  }

  try {
    await fileRecord.update({ status: 'processing', error: null });

    const { markdown, metadata: extractedMetadata = {}, entities = [] } = await extractFileContent(fileRecord);
    if (!markdown) {
      throw new Error('No textual content returned from extractor');
    }
    const chunks = chunkText(markdown, 1500, 200);

    const ragDoc = {
      id: fileRecord.id,
      title: fileRecord.name,
      content: markdown,
      metadata: {
        originalName: fileRecord.originalName,
        folderId: fileRecord.folderId,
        ownerId: fileRecord.ownerId,
        storagePath: fileRecord.storagePath,
        ...fileRecord.metadata,
        ...extractedMetadata
      },
      entities,
      relationships: [],
      chunks
    };

    const provider = ragService.getProvider();
    await provider.indexDocument(COLLECTION_NAME, ragDoc);

    await fileRecord.update({
      status: 'ready',
      metadata: {
        ...fileRecord.metadata,
        ...extractedMetadata,
        chunkCount: chunks.length
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
  processFile
};
