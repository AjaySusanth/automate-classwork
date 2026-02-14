import prisma from "../config/db.config.js";
import notificationService from "../services/notifications/notificationSetup.js";

export const sendTestNotification = async (req, res) => {
  try {
    const { message, channel } = req.body;
    const normalizedChannel = channel
      ? String(channel).trim().toLowerCase()
      : null;
    const allowedChannels = new Set(["telegram"]);

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (normalizedChannel && !allowedChannels.has(normalizedChannel)) {
      return res.status(400).json({ error: "Unsupported channel" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sent = await notificationService.send(
      user,
      message,
      normalizedChannel,
      null,
    );

    res.json({ sent });
  } catch (error) {
    console.error("Send test notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
};
