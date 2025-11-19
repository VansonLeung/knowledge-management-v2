const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const upload = require('../middleware/upload');
const { uploadFiles, listUserFiles, removeFile } = require('../controllers/file.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listUserFiles);
router.post('/', upload.array('files'), uploadFiles);
router.delete('/:fileId', removeFile);

module.exports = router;
