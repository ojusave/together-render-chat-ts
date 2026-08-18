import type { ErrorRequestHandler } from "express";

export const requestErrorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  const type =
    typeof error === "object" && error !== null && "type" in error
      ? String(error.type)
      : "";
  if (type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  console.error("Unhandled request error", error);
  return res.status(500).json({ error: "Internal server error." });
};
