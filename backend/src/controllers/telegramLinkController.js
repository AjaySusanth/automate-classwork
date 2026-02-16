import crypto from "crypto";
import prisma from "../config/db.config.js";

const getTokenTtlMinutes = () => {
  const raw = process.env.TELEGRAM_LINK_TOKEN_TTL_MINUTES;
  const ttl = raw ? Number(raw) : 10;
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 10;
};

const buildToken = () => crypto.randomBytes(24).toString("hex");

/**
 * Create a short-lived token for linking Telegram chatId to a user
 */
export const createLinkToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const ttlMinutes = getTokenTtlMinutes();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Keep only one active token per user to avoid confusion
    await prisma.telegramLinkToken.deleteMany({ where: { userId } });

    const token = buildToken();
    await prisma.telegramLinkToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return res.status(201).json({ token, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("Create link token error:", error);
    return res.status(500).json({ error: "Failed to create link token" });
  }
};

/**
 * Link Telegram chatId using a one-time token
 */
export const linkTelegramChat = async (req, res) => {
  try {
    const { token, chatId } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token is required" });
    }

    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ error: "chatId is required" });
    }

    const record = await prisma.telegramLinkToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt) {
      return res.status(400).json({ error: "Invalid or used token" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    const existingChat = await prisma.user.findUnique({
      where: { telegramChatId: chatId },
      select: { id: true },
    });

    if (existingChat && existingChat.id !== record.userId) {
      return res.status(409).json({ error: "Chat ID already linked" });
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { telegramChatId: true, telegramLinked: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (
      user.telegramLinked &&
      user.telegramChatId &&
      user.telegramChatId !== chatId
    ) {
      return res
        .status(409)
        .json({ error: "User already linked to a different chat" });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          telegramChatId: chatId,
          telegramLinked: true,
        },
      }),
      prisma.telegramLinkToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.status(200).json({ linked: true });
  } catch (error) {
    console.error("Link telegram chat error:", error);
    return res.status(500).json({ error: "Failed to link chat" });
  }
};
