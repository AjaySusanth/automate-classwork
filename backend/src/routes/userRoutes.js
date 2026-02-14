import express from "express";
import { getTelegramLinkedStudents } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/users/telegram-linked
 * Fetch all students with telegram linked (for n8n workflows)
 * Requires: teacher role
 */
router.get("/telegram-linked", authenticate, getTelegramLinkedStudents);

export default router;
