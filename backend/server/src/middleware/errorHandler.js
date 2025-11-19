const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const errorLog = {
    scope: 'ErrorHandler',
    name: err.name,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    stack: err.stack,
    original: err.original ? {
      message: err.original.message,
      detail: err.original.detail,
      code: err.original.code,
    } : undefined,
  };

  console.error(JSON.stringify(errorLog, null, 2));

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
