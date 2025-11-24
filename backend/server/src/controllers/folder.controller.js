const { listFolders, createFolder, updateFolder } = require('../services/file');

function sanitizeFolder(folder) {
  if (!folder) return null;
  const { id, name, parentId, referencePath, createdAt, updatedAt } = folder;
  return { id, name, parentId, referencePath, createdAt, updatedAt };
}

async function getFolders(req, res, next) {
  try {
    const folders = await listFolders(req.user.id);
    res.json({ success: true, data: folders.map(folder => sanitizeFolder(folder)) });
  } catch (error) {
    next(error);
  }
}

async function createFolderController(req, res, next) {
  try {
    const folder = await createFolder(req.user.id, req.body || {});
    res.status(201).json({ success: true, data: sanitizeFolder(folder) });
  } catch (error) {
    next(error);
  }
}

async function updateFolderController(req, res, next) {
  try {
    const folder = await updateFolder(req.user.id, req.params.folderId, req.body || {});
    res.json({ success: true, data: sanitizeFolder(folder) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFolders,
  createFolder: createFolderController,
  updateFolder: updateFolderController
};
