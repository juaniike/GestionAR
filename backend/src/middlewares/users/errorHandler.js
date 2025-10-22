// 🚀 OPCIONAL: Versión mejorada con logging:
function errorHandler(err, req, res, next) {
  // Log del error para debugging
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : "anonymous",
  });

  const status = err.status || err.error || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: status,
    message: message,
    // Stack trace solo en desarrollo
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
