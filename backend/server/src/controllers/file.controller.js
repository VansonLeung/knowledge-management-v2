const { saveUploadedFile, listFiles, deleteFile } = require('../services/file');

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
    const files = await listFiles(req.user.id, { folderId });
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

module.exports = {
  uploadFiles,
  listUserFiles,
  removeFile
};
