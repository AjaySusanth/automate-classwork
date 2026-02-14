import prisma from "../config/db.config.js";
import notificationService from "../services/notifications/notificationSetup.js";

export const sendTestNotification = async (req, res) => {
  try {
    const { message, channel } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const sent = await notificationService.send(user, message, channel, null);

    res.json({ sent });
  } catch (error) {
    console.error("Send test notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
};
