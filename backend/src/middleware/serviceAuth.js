/**
 * Middleware for internal service-to-service authentication.
 * Validates requests using a static API key (INTERNAL_API_KEY).
 * Used by n8n workflows to access /api/internal/* routes.
 */
export const serviceAuth = (req, res, next) => {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (!apiKey) {
    console.error("INTERNAL_API_KEY is not configured");
    return res.status(500).json({ error: "Service authentication not configured" });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No service key provided" });
  }

  const token = authHeader.substring(7);

  if (token !== apiKey) {
    return res.status(401).json({ error: "Invalid service key" });
  }

  next();
};
