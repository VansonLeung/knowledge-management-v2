const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const upload = require('../middleware/upload');
const {
	uploadFiles,
	listUserFiles,
	removeFile,
	downloadFile,
	updateFileMetadata,
	getFileDetails
} = require('../controllers/file.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listUserFiles);
router.post('/', upload.array('files'), uploadFiles);
router.get('/:fileId/download', downloadFile);
router.get('/:fileId/details', getFileDetails);
router.patch('/:fileId', updateFileMetadata);
router.delete('/:fileId', removeFile);

module.exports = router;
