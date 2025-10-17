function errorHandler(err, req, res, next) {
  res.status(err.status || 500).json({
    error: err.error || 500,
    message: err.message || "Internal Server Error",
  });
}

module.exports = errorHandler;
