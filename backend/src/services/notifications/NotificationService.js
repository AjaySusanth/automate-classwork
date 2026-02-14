import prisma from "../../config/db.config.js";

export default class NotificationService {
  constructor() {
    this.channels = new Map();
  }

  registerChannel(channel) {
    this.channels.set(channel.getName(), channel);
  }

  async send(user, message, channelName, assignmentId) {
    const channel = channelName
      ? this.channels.get(channelName)
      : this.channels.values().next().value;

    if (!channel) {
      throw new Error("No notification channel registered");
    }

    let status = "FAILED";
    let errorMessage = null;

    try {
      const sent = await channel.sendMessage(user, message);
      status = sent ? "SENT" : "FAILED";
      if (!sent) {
        errorMessage = "User has not linked messaging channel";
      }
    } catch (error) {
      errorMessage = error.message || "Failed to send notification";
    }

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        assignmentId: assignmentId ?? undefined,
        channel: channel.getName().toUpperCase(),
        status,
        errorMessage,
      },
    });

    return status === "SENT";
  }
}
