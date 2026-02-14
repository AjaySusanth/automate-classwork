import NotificationService from "./NotificationService.js";
import TelegramChannel from "./TelegramChannel.js";

const notificationService = new NotificationService();

const telegramChannel = new TelegramChannel({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
});

notificationService.registerChannel(telegramChannel);

export default notificationService;
