export function notFound(req, res, next) {
  const error = new Error(`Endpoint not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    status: statusCode,
    path: req.originalUrl
  });
}
