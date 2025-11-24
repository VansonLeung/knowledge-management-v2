const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getFolders, createFolder, updateFolder } = require('../controllers/folder.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', getFolders);
router.post('/', createFolder);
router.patch('/:folderId', updateFolder);

module.exports = router;
