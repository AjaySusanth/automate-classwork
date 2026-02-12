import jwt from "jsonwebtoken";

/**
 * Middleware to verify JWT tokens and authenticate users.
 * This checks if the request has a valid token in the Authorization header.
 * If valid, it attaches the decoded user data to req.user so other routes can use it.
 */
export const authenticate = (req, res, next) => {
  try {
    // Get token from header (format: "Bearer <token>")
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Extract the token part (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object so routes can access it
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Middleware to check if authenticated user has required role.
 * Use after authenticate middleware.
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};
