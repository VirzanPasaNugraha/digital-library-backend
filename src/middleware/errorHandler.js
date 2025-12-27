export function notFound(req, res) {
  res.status(404).json({ message: "Not Found" });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (res.headersSent) return next(err);

  // Multer file size limit
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File terlalu besar" });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
}
