const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads (if using local storage)
const storageBase = process.env.LOCAL_STORAGE_BASE || path.join(process.cwd(), 'storage');
app.use('/uploads', express.static(path.resolve(storageBase, 'uploads')));

// Routes
app.use('/api', routes);

// Error Handler
app.use(errorHandler);

module.exports = app;
