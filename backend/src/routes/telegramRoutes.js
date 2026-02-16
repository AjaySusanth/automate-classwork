import express from "express";
import {
  createLinkToken,
  linkTelegramChat,
} from "../controllers/telegramLinkController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// POST /api/telegram/link-token
router.post("/link-token", authenticate, createLinkToken);

// POST /api/telegram/link
router.post("/link", linkTelegramChat);

export default router;
