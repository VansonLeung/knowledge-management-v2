const { File } = require('../models');
const {
  saveUploadedFile,
  listFiles,
  deleteFile,
  moveFile,
  getFileDiagnostics
} = require('../services/file');
const { getProvider: getStorageProvider } = require('../services/storage');

function sanitizeFile(file) {
  if (!file) return null;
  const { id, name, originalName, status, size, mimeType, folderId, metadata, createdAt, updatedAt, error } = file;
  return { id, name, originalName, status, size, mimeType, folderId, metadata, createdAt, updatedAt, error };
}

async function uploadFiles(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const folderId = req.body.folderId || null;
    const conversationIds = Array.isArray(req.body.conversationIds)
      ? req.body.conversationIds
      : req.body.conversationIds
        ? [req.body.conversationIds]
        : [];

    const records = [];
    for (const file of req.files) {
      const record = await saveUploadedFile(req.user, file, { folderId, conversationIds });
      records.push(sanitizeFile(record));
    }

    res.status(201).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

async function listUserFiles(req, res, next) {
  try {
    const folderId = req.query.folderId || null;
    const scope = req.query.scope || null;
    const files = await listFiles(req.user.id, { folderId, scope });
    res.json({ success: true, data: files.map(file => sanitizeFile(file)) });
  } catch (error) {
    next(error);
  }
}

async function removeFile(req, res, next) {
  try {
    await deleteFile(req.user.id, req.params.fileId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function downloadFile(req, res, next) {
  try {
    const file = await File.findOne({ where: { id: req.params.fileId, ownerId: req.user.id } });
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const storage = getStorageProvider();
    const stream = await storage.createReadStream(file.storagePath);

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.originalName || file.name)}`
    );
    if (file.size) {
      res.setHeader('Content-Length', file.size);
    }

    stream.on('error', next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

async function updateFileMetadata(req, res, next) {
  try {
    const rawFolderId = req.body?.folderId;
    const folderId = rawFolderId ? rawFolderId : null;
    const file = await moveFile(req.user.id, req.params.fileId, folderId);
    res.json({ success: true, data: sanitizeFile(file) });
  } catch (error) {
    next(error);
  }
}

async function getFileDetails(req, res, next) {
  try {
    const details = await getFileDiagnostics(req.user.id, req.params.fileId);
    res.json({
      success: true,
      data: {
        file: sanitizeFile(details.file),
        document: details.document
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFiles,
  listUserFiles,
  removeFile,
  downloadFile,
  updateFileMetadata,
  getFileDetails
};
