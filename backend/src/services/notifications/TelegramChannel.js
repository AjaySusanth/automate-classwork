import axios from "axios";
import NotificationChannel from "./NotificationChannel.js";

export default class TelegramChannel extends NotificationChannel {
  constructor({ botToken }) {
    super();
    this.botToken = botToken;
  }

  getName() {
    return "telegram";
  }

  async sendMessage(user, message) {
    if (!this.botToken) {
      throw new Error("Telegram bot token is missing");
    }

    if (!user?.telegramChatId || !user.telegramLinked) {
      return false;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const response = await axios.post(
      url,
      {
        chat_id: user.telegramChatId,
        text: message,
      },
      { timeout: 5000 },
    );

    if (!response?.data?.ok) {
      const details = response?.data?.description || "Telegram send failed";
      throw new Error(details);
    }

    return true;
  }
}
