const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
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
} = require('../controllers/rag.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/indexes', listIndexes);
router.post('/indexes', createIndex);
router.delete('/indexes/:indexName', deleteIndex);
router.get('/indexes/:indexName/documents', listDocuments);
router.post('/indexes/:indexName/documents', createDocument);
router.get('/indexes/:indexName/documents/:documentId', getDocumentFromIndex);
router.put('/indexes/:indexName/documents/:documentId', updateDocument);
router.delete('/indexes/:indexName/documents/:documentId', deleteDocument);
router.get('/documents/:documentId', getDocumentById);
router.post('/search', searchGraph);
router.post('/workflows/basic', runBasicWorkflow);

module.exports = router;
