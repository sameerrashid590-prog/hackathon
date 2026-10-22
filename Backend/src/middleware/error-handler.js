function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const duplicate = err.code === 11000;
  const status = duplicate ? 409 : (Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500);
  if (status >= 500) console.error("Request failed:", err.name);
  const message = duplicate ? "Email already registered" : status >= 500 ? "Something went wrong" :
    err.type === "entity.parse.failed" ? "Invalid JSON request body" : err.message;
  res.status(status).json({ success: false, message });
}
module.exports = errorHandler;
